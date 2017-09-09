import program from 'commander';

import publish from './build';
import { add, list, remove } from './config';
import pkgJSON from '../package.json';

program
  .version(pkgJSON.version);

program
  .command('list')
  .description('list namespace config')
  .action(list);

program
  .command('add [name]')
  .description('add namespace config')
  .action(add);

program
  .option('remove')
  .description('remove namespace config')
  .action(remove);

program.parse(process.argv);

if (!program.args.length) {
  publish();
}
