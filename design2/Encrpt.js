const crypto = require('crypto');
const qs = require('querystring');

class Cipher{

    constructor(key , salt){
        this.algorithm = 'aes-128-cbc';
        this.key       = crypto.scryptSync( key ,salt, 16);
        this.iv        = Buffer.alloc(16, 0);
      
    }

    decrypt( enc ){

        let decipher = crypto.createDecipheriv( this.algorithm, this.key , this.iv );
        let decrypted = decipher.update( enc , 'base64', 'utf-8');
        decrypted += decipher.final('utf-8');

        return decrypted ;
    }

    encrypt( text ){

        let cipher = crypto.createCipheriv( this.algorithm, this.key, this.iv);
        let encrypted = cipher.update( text, 'utf-8', 'base64');
        encrypted += cipher.final('base64');
        
        return encrypted ;
    }

}

module.exports = { Cipher }


