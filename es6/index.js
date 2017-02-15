import program from 'commander';

import publish from './build';
import pkgJSON from '../package.json';

program.version(pkgJSON.version);
program.parse(process.argv);

publish(program);
