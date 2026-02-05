require('dotenv').config();

const fs = require('fs');
const path = require('path');
const connectDB = require('./mongo');
const Product = require('./Product.model');

const urlMapPath = path.join(__dirname, 'cloudinary-urls.json');

function normalizeBasename(input) {
    return path.basename(input || '').trim();
}

async function updateProducts() {
    if (!fs.existsSync(urlMapPath)) {
        console.error('❌ No se encontró el archivo cloudinary-urls.json');
        console.log('   Primero ejecuta: npm run upload-images');
        process.exit(1);
    }

    const urlMap = JSON.parse(fs.readFileSync(urlMapPath, 'utf-8'));
    const urlMapLower = new Map();
    
    // Crear índice case-insensitive para hacer matching más robusto
    Object.keys(urlMap).forEach(key => {
        urlMapLower.set(key.toLowerCase(), urlMap[key]);
    });

    await connectDB();

    const products = await Product.find({});
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    console.log(`\n📦 Procesando ${products.length} productos...\n`);

    for (const product of products) {
        const img = product.img || '';

        // Si ya es URL de Cloudinary, saltar
        if (/cloudinary\.com/i.test(img)) {
            console.log(`⏩ ${product.title} - Ya tiene URL de Cloudinary`);
            skipped++;
            continue;
        }

        const base = normalizeBasename(img);
        let cloudUrl = urlMapLower.get(base.toLowerCase());

        if (!cloudUrl) {
            console.log(`⚠️  ${product.title} - No se encontró imagen: ${base}`);
            skipped++;
            continue;
        }

        try {
            product.img = cloudUrl;
            await product.save();
            updated++;
            console.log(`✅ ${product.title}`);
            console.log(`   ${base} -> Cloudinary\n`);
        } catch (error) {
            console.error(`❌ ${product.title} - Error: ${error.message}\n`);
            errors++;
        }
    }

    console.log('='.repeat(60));
    console.log(`📊 RESUMEN:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏩ Omitidos: ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log('='.repeat(60));

    process.exit(0);
}

updateProducts().catch((error) => {
    console.error('❌ Error general:', error.message);
    process.exit(1);
});
