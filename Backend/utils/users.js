const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'users.json');

function readUsers(){
  try{
    if(!fs.existsSync(FILE)) return {};
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw || '{}');
  }catch(e){ return {}; }
}

function writeUsers(obj){
  try{ fs.writeFileSync(FILE, JSON.stringify(obj, null, 2), 'utf8'); }catch(e){}
}

module.exports = { readUsers, writeUsers };
