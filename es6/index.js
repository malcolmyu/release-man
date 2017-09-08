import program from 'commander';

import publish from './build';
import { add, list, remove } from './config';
import pkgJSON from '../package.json';

program
  .version(pkgJSON.version)
  .action(publish);

program
  .command('list')
  .description('list namespace config')
  .action(list);

program
  .command('add')
  .description('add namespace config')
  .action(add);

program
  .option('remove <name>')
  .description('remove namespace config')
  .action(remove);

program.parse(process.argv);
