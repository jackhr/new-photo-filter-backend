const Photo = require('../../models/photo');
const uuid = require('uuid');
const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");
const BASE_URL = process.env.S3_BASE_URL;
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.REGION;

module.exports = {
    create,
    deleteOne,
    getAll,
}

async function deleteOne(req, res) {
    let message = 'Photo Deleted';
    try {
        const photo = await Photo.findById(req.params.id);
        if (photo.user.toString() !== req.user._id.toString()) {
            throw new Error('Invalid Request');
        }
        await deleteImage(photo.AWSKey);
        await photo.deleteOne();
    } catch (err) {
        message = err.message;
        res.status(400);
    }
    const photos = await getUserPhotos(req.user);
    res.json({ message, photos });
}

async function getAll(req, res) {
    let message = 'Photos retrieved successfully.';
    let photos = [];
    try {
        photos = await getUserPhotos(req.user);
    } catch (err) {
        message = err.message;
        res.status(400);
    }
    res.json({ message, photos });
}

async function getUserPhotos(user) {
    const photos = await Photo.find({ user: user._id }).populate('user').exec();
    return photos;
}

async function create(req, res) {
    let message = 'Photo Created';
    try {
        const AWSData = await getNewImageUrl(req.file);
        console.log("AWSData:", AWSData);
        if (AWSData.success) {
            await Photo.create({
                ...req.body,
                AWSKey: AWSData.key,
                sourceURL: AWSData.url,
                user: req.user._id
            });
        } else {
            throw new Error(AWSData.message);
        }
    } catch (err) {
        message = err.message;
        res.status(400);
    }
    const photos = await getUserPhotos(req.user);
    res.json({ message, photos });
}

/*-----Helper Functions-----*/

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