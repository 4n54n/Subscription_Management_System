import fs from 'fs';
import YAML from 'yaml';

const samplePath = 'c:/Users/ansan/Desktop/Git Sync/IntoAI_Workspace-on-oracle/packages/frontend/core/public/invoice_sample.yaml';
const yamlText = fs.readFileSync(samplePath, 'utf8');

try {
  const doc = YAML.parseDocument(yamlText);
  let items = doc.get('items');
  console.log('Original items length:', items.items.length);
  
  const newItemNum = String(items.items.length + 1).padStart(2, '0');
  const newNode = doc.createNode({
    num: newItemNum,
    name: 'New Phase / Item',
    desc: 'Enter description of item',
    qty: 1,
    rate: 0
  });
  
  items.add(newNode);
  console.log('After items.add(newNode) length:', items.items.length);
  
  const items2 = doc.get('items');
  console.log('Items2 length:', items2.items.length);
  console.log('Resulting YAML snippet:\n', doc.toString().split('items:')[1].substring(0, 300));
} catch (e) {
  console.error('Error:', e);
}
