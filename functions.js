var bcrypt = require('bcryptjs'),
    Q = require('q'),
    config = require('./config.js'); //config file contains all tokens and other private info

// MongoDB connection information
var mongodbUrl = 'mongodb://' + config.mongodbHost + ':27017/users';
var articleUrl = 'mongodb://' + config.mongodbHost + ':27017/articles';
var MongoClient = require('mongodb').MongoClient

/*=====================Get all the articles============= */
exports.articleSearch = function () {
  var deferred = Q.defer();

  MongoClient.connect(articleUrl, function (err, db) {
    var collection = db.collection('userArticles');
    

 
    collection.find().toArray()
      .then(function (result) {
      console.log("DB data: "+ result[0].title);
        
      db.close();
      deferred.resolve(result);
    });

   
  });

  return deferred.promise;
}

exports.articleDelete = function(title){
  var deferred = Q.defer();

  MongoClient.connect(articleUrl, function(err,db){
    var collection = db.collection('userArticles');
    var query = {title: title};
    collection.remove(query, function(err,obj){
      if(err) throw err;
      console.log("Deleted: " + title);
      db.close();

    });
    
  });
  deferred.resolve(true);
}

/* saves the article data and image file path */
exports.articleSave = function (username, title, article, img) {
  var deferred = Q.defer();

  MongoClient.connect(articleUrl, function (err, db) {
    var collection = db.collection('userArticles');

    var userArticle = { };
    if(img != null){
        userArticle = {
        "username": username,
        "title": title,
        "article": article,
        "image": img
      };
    }else{
      userArticle = {
        "username": username,
        "title": title,
        "article": article
      };
    }
 

    collection.insert(userArticle)
        .then(function () {
        db.close();
        deferred.resolve("Article Created");
    });
  });

  return deferred.promise;
}

exports.updateAccount = function(username, password, icon){
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function(err, db){
      var query = {"username": username};
      var updateVal = {$set: {"avatar":icon}};

      db.collection('localUsers').updateOne(query, updateVal, function(err,res){
        if(err) deferred.resolve(false);

        db.close();
        console.log('User icon updated');
        deferred.resolve(res);
      });
  });
}

//used in local-signup strategy
exports.localReg = function (username, password) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection('localUsers');

    //check if username is already assigned in our database
    collection.findOne({'username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("USERNAME ALREADY EXISTS:", result.username);
          deferred.resolve(false); // username exists
        }
        else  {
          var hash = bcrypt.hashSync(password, 8);
          var user = {
            "username": username,
            "password": hash,
            "avatar": __dirname + "/siteimages/default_icon.ico"
          }

          console.log("CREATING USER:", username);

          collection.insert(user)
            .then(function () {
              db.close();
              deferred.resolve(user);
            });
        }
      });
  });

  return deferred.promise;
};


//check if user exists
    //if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
      //if password matches take into website
  //if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection('localUsers');

    collection.findOne({'username' : username})
      .then(function (result) {
        if (null == result) {
          console.log("USERNAME NOT FOUND:", username);

          deferred.resolve(false);
        }
        else {
          var hash = result.password;

          console.log("FOUND USER: " + result.username);

          if (bcrypt.compareSync(password, hash)) {
            deferred.resolve(result);
          } else {
            console.log("AUTHENTICATION FAILED");
            deferred.resolve(false);
          }
        }

        db.close();
      });
  });

  return deferred.promise;
}