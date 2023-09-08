const fs = require('fs');
const path = require('path');


let fileName = 'helloTest';
const folderName = 'JsTest';

const folderPath = path.join(__dirname, folderName);
try {
  if (fs.existsSync(folderName)) {
    fs.rmdirSync(folderPath, { recursive: true });
    console.log('removed');
  }
  fs.mkdirSync(folderName);
} catch(error) {
  console.error('could not crate a file', error);
}


fileName = fileName + '.js';
const filePath = path.join(folderName, fileName);
try {
 fs.writeFileSync(filePath, `Hello js\n`);
} catch (error) {
  console.error('coild ot write to filw', error);
}
