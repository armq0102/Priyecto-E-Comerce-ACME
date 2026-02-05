require('dotenv').config();

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const connectDB = require('./mongo');
const Product = require('./Product.model');

const imagesDir = path.join(__dirname, '../images');
const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const isDryRun = process.env.DRY_RUN === '1';

function ensureCloudinaryConfig() {
    return (
        !!process.env.CLOUDINARY_CLOUD_NAME &&
        !!process.env.CLOUDINARY_API_KEY &&
        !!process.env.CLOUDINARY_API_SECRET
    );
}

function normalizeBasename(input) {
    return path.basename(input || '').trim();
}

async function uploadImages() {
    if (!fs.existsSync(imagesDir)) {
        throw new Error(`No existe la carpeta de imagenes: ${imagesDir}`);
    }

    const files = fs.readdirSync(imagesDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return allowedExt.has(ext);
    });

    if (!files.length) {
        throw new Error('No se encontraron imagenes en la carpeta /images');
    }

    const map = new Map();

    for (const file of files) {
        const filePath = path.join(imagesDir, file);
        const publicId = path.parse(file).name;

        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: 'acme/products',
                public_id: publicId,
                overwrite: true,
                resource_type: 'image'
            });
            map.set(file, result.secure_url);
            console.log(`OK -> ${file} => ${result.secure_url}`);
        } catch (error) {
            console.error(`ERROR -> ${file}: ${error.message}`);
        }
    }

    return map;
}

async function updateProducts(urlMap) {
    const products = await Product.find({});
    let updated = 0;
    let skipped = 0;

    for (const product of products) {
        const img = product.img || '';

        if (/^https?:\/\//i.test(img)) {
            skipped += 1;
            continue;
        }

        const base = normalizeBasename(img);
        const cloudUrl = urlMap.get(base);

        if (!cloudUrl) {
            skipped += 1;
            continue;
        }

        if (!isDryRun) {
            product.img = cloudUrl;
            await product.save();
        }

        updated += 1;
        console.log(`UPDATE -> ${product.title} -> ${cloudUrl}`);
    }

    console.log(`\nResumen: actualizados=${updated}, omitidos=${skipped}`);
}

async function run() {
    if (!ensureCloudinaryConfig()) {
        console.error('Faltan variables de Cloudinary. Revisa CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
        process.exit(1);
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    await connectDB();

    const urlMap = await uploadImages();
    await updateProducts(urlMap);

    process.exit(0);
}

run().catch((error) => {
    console.error('Error general:', error.message);
    process.exit(1);
});
