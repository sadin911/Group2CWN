import fs from 'fs';
import path from 'path';

const types = [
  { code: 'GRA', name: 'หญ้า' },
  { code: 'FIR', name: 'ไฟ' },
  { code: 'WAT', name: 'น้ำ' },
  { code: 'LIG', name: 'สายฟ้า' },
  { code: 'PSY', name: 'พลังจิต' },
  { code: 'FIG', name: 'ต่อสู้' },
  { code: 'DAR', name: 'ความมืด' },
  { code: 'MET', name: 'โลหะ' }
];

const scfDir = path.join('public', 'card-images', 'SCF');
if (!fs.existsSync(scfDir)) {
  fs.mkdirSync(scfDir, { recursive: true });
}

types.forEach(t => {
  const fileName = `${t.code}_พลังงานพื้นฐาน_[${t.name}].webp`;
  const src = path.join('public', 'card-images', 'SCE', fileName);
  const dest = path.join(scfDir, fileName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Successfully created:', dest);
  } else {
    console.log('Source not found:', src);
  }
});
