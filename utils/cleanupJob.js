const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

/**
 * Cleanup Job: Deletes user uploaded try-on images older than 4 days
 * Runs daily at 2 AM
 */
const startCleanupJob = () => {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('🧹 Running try-on image cleanup job...');
        
        const tryonDir = path.join(__dirname, '..', 'uploads', 'tryons');
        const fourDaysAgo = Date.now() - (4 * 24 * 60 * 60 * 1000);
        
        try {
            const files = await fs.readdir(tryonDir);
            let deletedCount = 0;
            
            for (const file of files) {
                const filePath = path.join(tryonDir, file);
                
                try {
                    const stats = await fs.stat(filePath);
                    
                    // Delete if older than 4 days
                    if (stats.mtimeMs < fourDaysAgo) {
                        await fs.unlink(filePath);
                        deletedCount++;
                        console.log(`  ✓ Deleted old file: ${file}`);
                    }
                } catch (err) {
                    console.error(`  ✗ Error processing ${file}:`, err.message);
                }
            }
            
            console.log(`✅ Cleanup complete. Deleted ${deletedCount} old files.`);
        } catch (error) {
            console.error('❌ Cleanup job error:', error);
        }
    });
    
    console.log('✅ Try-on cleanup job scheduled (runs daily at 2 AM)');
};

module.exports = { startCleanupJob };
