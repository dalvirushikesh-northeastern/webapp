module.exports = (sequelize , DataTypes) =>{
    const User = sequelize.define("User",{
    //attributes for the project
     id : {
        type : DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        readOnly: true,
        primaryKey: true
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    username : {
        type: DataTypes.STRING,
        allowNull: false,
        unique: 'username',
        validate: {
            isEmail: true
        }
    },
    password : {
        type : DataTypes.STRING,
        allowNull: false
    },
    verifyuser: {

        type: DataTypes.BOOLEAN,

      },

    },
    
        {

            createdAt: "account_created",
      
            updatedAt: "account_updated",
      
          }
    
    );
    
    return User;
    };