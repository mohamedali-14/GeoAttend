const { runFullIntegrationTest } = require('./integration.test');

async function runAllTests() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║                                                   ║');
    console.log('║     🚀 GEOATTEND - BACKEND TEST SUITE 🚀          ║');
    console.log('║                                                   ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('\n');
    
    await runFullIntegrationTest();
}

if (require.main === module) {
    runAllTests();
}

module.exports = { runAllTests };