require('dotenv').config();

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const imagesDir = path.join(__dirname, '../images');
const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function ensureCloudinaryConfig() {
    return (
        !!process.env.CLOUDINARY_CLOUD_NAME &&
        !!process.env.CLOUDINARY_API_KEY &&
        !!process.env.CLOUDINARY_API_SECRET
    );
}

async function uploadImages() {
    if (!ensureCloudinaryConfig()) {
        console.error('❌ Faltan variables de Cloudinary. Revisa CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
        process.exit(1);
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    if (!fs.existsSync(imagesDir)) {
        throw new Error(`❌ No existe la carpeta de imágenes: ${imagesDir}`);
    }

    const files = fs.readdirSync(imagesDir).filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return allowedExt.has(ext);
    });

    if (!files.length) {
        console.log('⚠️  No se encontraron imágenes en la carpeta /images');
        process.exit(0);
    }

    console.log(`📤 Subiendo ${files.length} imágenes a Cloudinary...\n`);

    const results = [];
    let success = 0;
    let failed = 0;

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
            
            results.push({
                file,
                url: result.secure_url,
                success: true
            });
            
            success++;
            console.log(`✅ ${file}`);
            console.log(`   -> ${result.secure_url}\n`);
        } catch (error) {
            results.push({
                file,
                error: error.message,
                success: false
            });
            
            failed++;
            console.error(`❌ ${file}: ${error.message}\n`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 RESUMEN:`);
    console.log(`   ✅ Exitosas: ${success}`);
    console.log(`   ❌ Fallidas: ${failed}`);
    console.log('='.repeat(60));

    // Guardar mapa de URLs para referencia
    const urlMap = {};
    results.forEach(r => {
        if (r.success) {
            urlMap[r.file] = r.url;
        }
    });

    const mapPath = path.join(__dirname, 'cloudinary-urls.json');
    fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2));
    console.log(`\n💾 URLs guardadas en: ${mapPath}`);
    console.log('\n✨ Puedes usar estas URLs para actualizar los productos en MongoDB.');
}

uploadImages().catch((error) => {
    console.error('❌ Error general:', error.message);
    process.exit(1);
});
