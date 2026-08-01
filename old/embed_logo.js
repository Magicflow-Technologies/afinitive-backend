const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'templates', 'hbs', 'corfid_logo.png');
const hbsPath = path.join(__dirname, 'templates', 'hbs', '04_dj_residencia_fiscal.hbs');

const imgBuf = fs.readFileSync(imgPath);
const b64 = 'data:image/png;base64,' + imgBuf.toString('base64');

let hbs = fs.readFileSync(hbsPath, 'utf8');
// Replace <img src="..." with the inline base64 string
hbs = hbs.replace(/<img\s+src="[^"]*"/g, `<img src="${b64}"`);

fs.writeFileSync(hbsPath, hbs, 'utf8');
console.log('CORFID logo embedded in 04_dj_residencia_fiscal.hbs successfully!');
