const uuid = require('uuid');
const Jimp = require('jimp');
const Photo = require('../../models/photo');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
    redisClient,
    connectRedis,
    disconnectRedis
} = require('../../config/redisClient');
const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");
const BASE_URL = process.env.S3_BASE_URL;
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.REGION;

module.exports = {
    applyFilter,
    create,
    deleteOne,
    getAll,
}

async function applyFilter(req, res) {
    let message = 'Filter Applied';
    let filteredPhotoUrl = null;
    try {
        await connectRedis();
        const filterType = req.body.filterType;
        const filteredPhotoKey = `photo:${req.params.id}:${filterType}`;
        filteredPhotoUrl = await redisClient.get(filteredPhotoKey);
        if (!filteredPhotoUrl) {
            const photo = await Photo.findById(req.params.id);
            const imageUrl = photo.sourceURL;
            const image = await Jimp.read(imageUrl);
    
            switch (filterType) {
                case 'vintage':
                    image.sepia()
                        .brightness(-0.1)
                        .contrast(-0.1);
                    break;

                case 'contrast':
                    image.contrast(0.15);
                    break;

                case 'grayscale':
                    image.grayscale();
                    break;

                case 'sepia':
                    image.sepia();
                    break;

                case 'vignette':
                    // This is a simplified approach to create a vignette effect
                    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                        // Calculate distance to the center of the image
                        const centerX = image.bitmap.width / 2;
                        const centerY = image.bitmap.height / 2;
                        const distanceToCenter = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
                        const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
                        const vignetteScaleFactor = 1 - distanceToCenter / maxDistance;

                        // Adjust the brightness based on the distance to the center
                        // The farther from the center, the more the brightness is reduced
                        this.bitmap.data[idx] = this.bitmap.data[idx] * vignetteScaleFactor; // Red
                        this.bitmap.data[idx + 1] = this.bitmap.data[idx + 1] * vignetteScaleFactor; // Green
                        this.bitmap.data[idx + 2] = this.bitmap.data[idx + 2] * vignetteScaleFactor; // Blue
                        // Alpha (idx + 3) is not modified
                    });
                    break;
            }
    
            // Convert image to buffer
            const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    
            // Temporarily serve the image (demonstration purpose)
            // In practice, consider creating a more permanent method of serving the edited images
            filteredPhotoUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
            redisClient.set(filteredPhotoKey, JSON.stringify(filteredPhotoUrl));
        } else {
            filteredPhotoUrl = JSON.parse(filteredPhotoUrl);
        }
    } catch (err) {
        message = err.message;
        res.status(400);
    } finally {
        await disconnectRedis();
    }
    res.json({ message, filteredPhotoUrl });
}

async function deleteOne(req, res) {
    const response = { message: 'Photo Deleted', photos: []};
    try {
        const photo = await Photo.findById(req.params.id);
        if (photo.user.toString() !== req.user._id.toString()) {
            throw new Error('Invalid Request');
        }
        await deleteImage(photo.AWSKey);
        await photo.deleteOne();
    } catch (err) {
        response.message = err.message;
        res.status(400);
    }
    response.photos = await getUserPhotos(req.user);
    res.json(response);
}

async function getAll(req, res) {
    const response = { message: 'Photos retrieved successfully.', photos: [] };
    try {
        const photos = await getUserPhotos(req.user);
        const photosWithSignedUrls = await Promise.all(photos.map(async (photo) => {
            try {
                const signedUrl = await generateSignedUrl(photo.AWSKey);
                return { ...photo._doc, signedUrl };
            } catch (error) {
                console.error("Error generating signed URL:", error);
                return { ...photo._doc, signedUrl: null };
            }
        }));

        response.photos = photosWithSignedUrls;
    } catch (err) {
        console.error("Error getting user photos:", err);
        response.message = err.message;
        res.status(400);
    }
    res.json(response);
}

async function getUserPhotos(user) {
    const photos = await Photo.find({ user: user._id }).populate('user').exec();
    return photos;
}

async function create(req, res) {
    const response = { message: 'Photos retrieved successfully.', photo: {} };
    try {
        const AWSData = await getNewImageUrl(req.file);
        if (AWSData.success) {
            const photo = await Photo.create({
                ...req.body,
                AWSKey: AWSData.key,
                sourceURL: AWSData.url,
                user: req.user._id
            });
            const signedUrl = await generateSignedUrl(photo.AWSKey);
            response.photo = { ...photo._doc, signedUrl };
        } else {
            throw new Error(AWSData.message);
        }
    } catch (err) {
        message = err.message;
        res.status(400);
    }
    res.json(response);
}

/*-----Helper Functions-----*/

async function generateSignedUrl(AWSKey, Expires = 30) { // Default expiration time: 15 minutes
    const s3 = new S3Client({ region: REGION });
    const getParams = {
        Bucket: BUCKET,
        Key: AWSKey
    };
    return await getSignedUrl(s3, new GetObjectCommand(getParams), { expiresIn: Expires });
}

function generateAWSKey(photo) {
    const hex = uuid.v4().slice(uuid.v4().length - 6);
    const fileExtension = photo.mimetype.match(/[/](.*)/)[1].replace('', '.');
    return hex + fileExtension;
}

async function getNewImageUrl(photo) {
    const uploadParams = {
        Bucket: BUCKET,
        Key: generateAWSKey(photo),
        Body: photo.buffer
    }
    const s3 = new S3Client({ region: REGION });
    const run = async () => {
        const res = { success: true, message: `Successfully uploaded ${uploadParams.Key}:` };
        try {
            const data = await s3.send(new PutObjectCommand(uploadParams));
        } catch (err) {
            res.success = false;
            res.message = `Error uploading ${uploadParams.Key}: ${err.message}`;
        }
        return res;
    };
    const runRes = await run();
    return {
        url: `${BASE_URL}${BUCKET}/${uploadParams.Key}`,
        key: uploadParams.Key,
        ...runRes
    };
}

async function deleteImage(key) {
    const uploadParams = {
        Bucket: process.env.S3_BUCKET,
        Key: key,
    }
    const s3 = new S3Client({ region: REGION });
    const run = async () => {
        const res = { success: true, message: `Successfully deleted ${uploadParams.Key}:` };
        try {
            const data = await s3.send(new DeleteObjectCommand(uploadParams));
        } catch (err) {
            res.success = false;
            res.message = `Error deleting ${uploadParams.Key}: ${err.message}`;
        }
        return res;
    };
    const runRes = await run();
    return {
        url: `${BASE_URL}${BUCKET}/${uploadParams.Key}`,
        key: uploadParams.Key,
        ...runRes
    };
}