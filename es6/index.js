import program from 'commander';

import publish from './build';
import pkgJSON from '../package.json';

program
    .version(pkgJSON.version)
    .option('-v, --version', '查看版本号')
    .parse(process.argv);

if (!program.args.length) {
    publish();
} else {
    if (program.version) {
        console.log(pkgJSON.version);
    }
}
