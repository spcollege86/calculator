const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
            len: [3, 50],
            notEmpty: true
        }
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
            notEmpty: true
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    avatar: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
            is: /^[+]?[\d\s-()]+$/
        }
    },
    company: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
        allowNull: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    last_login_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    settings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {
            language: 'zh-CN',
            timezone: 'Asia/Shanghai',
            currency: 'CNY',
            notifications: {
                email: true,
                push: true
            }
        }
    }
}, {
    tableName: 'users',
    timestamps: true,
    paranoid: true, // 软删除
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash) {
                const salt = await bcrypt.genSalt(12);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash')) {
                const salt = await bcrypt.genSalt(12);
                user.password_hash = await bcrypt.hash(user.password_hash, salt);
            }
        }
    },
    indexes: [
        {
            unique: true,
            fields: ['email']
        },
        {
            unique: true,
            fields: ['username']
        },
        {
            fields: ['is_active']
        },
        {
            fields: ['role']
        }
    ]
});

// 实例方法
User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password_hash;
    delete values.deleted_at;
    return values;
};

// 类方法
User.findByCredentials = async function(identifier, password) {
    const user = await User.findOne({
        where: {
            [sequelize.Sequelize.Op.or]: [
                { email: identifier },
                { username: identifier }
            ],
            is_active: true
        }
    });

    if (!user) {
        throw new Error('用户不存在或已被禁用');
    }

    const isValid = await user.validatePassword(password);
    if (!isValid) {
        throw new Error('密码错误');
    }

    // 更新最后登录时间
    await user.update({ last_login_at: new Date() });
    
    return user;
};

User.findByEmail = async function(email) {
    return User.findOne({
        where: { email, is_active: true }
    });
};

User.findByUsername = async function(username) {
    return User.findOne({
        where: { username, is_active: true }
    });
};

module.exports = User; 