const fs = require('fs');
const path = require('path');

class GoonBotUser {
    constructor(userID, save_loc) {
        this.userid = userID;
        this.save_loc = save_loc;
        this.balance = null;
        this.date_created = new Date(); // Add creation date on instantiation
        this.debt = null;
    }

    save_user() {
        // Ensure the directory structure exists
        const dir = path.dirname(this.save_loc);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Prepare user data
        const userData = {
            userid: this.userid,
            balance: this.balance,
            debt: this.debt,
            date_created: this.date_created.toISOString() // Store as ISO string
        };
        // Write to file
        fs.writeFileSync(this.save_loc, JSON.stringify(userData, null, 2));
    }

    add_bal(val) {
        this.balance += val;
        this.save_user();
    }

    sub_bal(val) {
        if (this.balance < val) {
            return false;
        }
        this.balance -= val;
        this.save_user();
        return true;
    }

    add_debt(val) {
        this.debt += val;
        this.save_user();
    }

    pay_debt(val) {
        this.debt -= val;
        if (this.debt < 0){
            this.add_bal(-1*this.debt);
            this.debt = 0;
        }
        this.save_user();
    }

    static load_user(userID, baseDir = path.join(__dirname, '..', 'object_store', 'users')) {
        const savePath = path.join(baseDir, `${userID}.json`);
        
        if (!fs.existsSync(savePath)) {
            return null; // User doesn't exist
        }
    
        try {
            const rawData = fs.readFileSync(savePath);
            const userData = JSON.parse(rawData);
            
            // Reconstruct the user object
            const user = new GoonBotUser(userData.userid, savePath);
            user.balance = userData.balance;
            user.debt = userData.debt;
            user.date_created = new Date(userData.date_created); // Parse stored date
            
            return user;
        } catch (error) {
            console.error(`Error loading user ${userID}:`, error);
            return null;
        }
    }
}



module.exports = GoonBotUser;