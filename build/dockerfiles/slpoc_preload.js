const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

function main() {
    if (process.env.PRELOAD_EXECUTED) {
        console.log('Skipping preload logic on subsequent entry');
        return;
    }

    process.env.PRELOAD_EXECUTED = 1;

    if (require.main === module) {
        console.log('preload.js is the main module, exiting.');
        process.exit(0);
    }

    const pathToSlAgentCli = resolve(__dirname, './cli.js');

    let token = '--tokenFile ./sltoken.txt';
    if (process.env.SL_token) {
        token = `--token ${process.env.SL_token}`;
    } else if (process.env.SL_tokenFile) {
        token = `--tokenFile ${process.env.SL_tokenFile}`;
    }

    let bsid = '--buildSessionIdFile ./buildSessionId';
    if (process.env.SL_buildSessionId) {
        bsid = `--buildSessionId ${process.env.SL_buildSessionId}`;
    } else if (process.env.SL_buildSessionIdFile) {
        bsid = `--buildSessionIdFile ${process.env.SL_buildSessionIdFile}`;
    }
    let projectRoot = '';
    if (process.env.SL_projectRoot) {
        projectRoot = `--projectRoot ${process.env.SL_projectRoot}`;
    }

    const [argv0, ...restArgv] = process.argv.map(x => x.includes(' ') ? `"${x}"` : x);
    const originalArgv = process.argv.join(' ');
    const args = ['run', ...token.split(' '), ...bsid.split(' '), ..projectRoot.split(' '), '--', ...restArgv];
    const processArgs = [pathToSlAgentCli, ...args];
    process.env.NODE_OPTIONS = '';
    process.env.NODE_DEBUG = 'sl';

    try {
        console.info('Rerun main module with args - ', processArgs);
        const result = spawnSync(process.argv[0], processArgs, { stdio: 'inherit', shell: false });
        if (result.error) {
            throw result.error;
        }
        process.exit(result.status);
    } catch (error) {
        console.error('Error occurred while executing the target script:', error);
        console.info('Run main module with original args - ', originalArgv);
        const result = spawnSync(argv0, originalArgv.split(' '), { stdio: 'inherit', shell: false });
        if (result.error) {
            console.error('Error occurred while executing the original script:', result.error);
            process.exit(1);
        }
        process.exit(result.status);
    }
}

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

main();
