const fs = require('fs');
const path = require('path');

class JsonDB {
  constructor(filename) {
    this.filepath = path.join(__dirname, '../data', filename);
    this.ensureFileExists();
  }

  ensureFileExists() {
    const dir = path.dirname(this.filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filepath)) {
      fs.writeFileSync(this.filepath, JSON.stringify([], null, 2));
    }
  }

  read() {
    try {
      const data = fs.readFileSync(this.filepath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      return [];
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing JSON file:', error);
      return false;
    }
  }

  find(filter = {}) {
    const data = this.read();
    if (Object.keys(filter).length === 0) {
      return data;
    }

    return data.filter(item => {
      return Object.keys(filter).every(key => {
        if (key.includes('.')) {
          // Handle nested properties like 'location.city'
          const keys = key.split('.');
          let value = item;
          for (const k of keys) {
            value = value?.[k];
          }
          
          if (typeof filter[key] === 'object' && filter[key].$regex) {
            return new RegExp(filter[key].$regex, filter[key].$options || 'i').test(value);
          }
          return value === filter[key];
        }
        
        if (Array.isArray(item[key])) {
          // Handle array fields like skills_required
          if (typeof filter[key] === 'object' && filter[key].$in) {
            return filter[key].$in.some(filterValue => 
              item[key].some(itemValue => 
                new RegExp(filterValue.source, filterValue.flags).test(itemValue)
              )
            );
          }
          return item[key].includes(filter[key]);
        }
        
        return item[key] === filter[key];
      });
    });
  }

  findById(id) {
    const data = this.read();
    return data.find(item => item._id === id);
  }

  insert(item) {
    const data = this.read();
    const newItem = {
      _id: this.generateId(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.push(newItem);
    this.write(data);
    return newItem;
  }

  insertMany(items) {
    const data = this.read();
    const newItems = items.map(item => ({
      _id: this.generateId(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    data.push(...newItems);
    this.write(data);
    return newItems;
  }

  update(id, updates) {
    const data = this.read();
    const index = data.findIndex(item => item._id === id);
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.write(data);
      return data[index];
    }
    return null;
  }

  delete(id) {
    const data = this.read();
    const index = data.findIndex(item => item._id === id);
    if (index !== -1) {
      const deleted = data.splice(index, 1)[0];
      this.write(data);
      return deleted;
    }
    return null;
  }

  count(filter = {}) {
    return this.find(filter).length;
  }

  clear() {
    this.write([]);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = JsonDB;