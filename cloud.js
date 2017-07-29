"use strict"

var express = require('express'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    fs = require('fs');


const fileUpload = require('express-fileupload');




var config = require('./config.js'),
    funct = require('./functions.js');


var app = express();


app.use(express.static(__dirname + '/public'));
app.use(logger('combined'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(fileUpload());

app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});


var hbs = exphbs.create({
    defaultLayout: 'main', 
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');


var port = process.env.PORT || 5000; 
app.listen(port);
console.log("listening on " + port + "!");


var deleteFormPrototype = fs.readFileSync("./views/protoviews/deleteform.html", 'utf-8');
var articlediv = fs.readFileSync("./views/protoviews/article.html", 'utf-8');








//===============PASSPORT=================
// Use the LocalStrategy within Passport to login/"signin" users.
passport.use('local-signin', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    funct.localAuth(username, password)
    .then(function (user) {
      if (user) {
        console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT LOG IN");
        req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));
// Use the LocalStrategy within Passport to register/"signup" users.
passport.use('local-signup', new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    funct.localReg(username, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.username);
        req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));


//===============PASSPORT=================
// Passport session setup.
passport.serializeUser(function(user, done) {
  console.log("serializing " + user.username);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.error = 'Please sign in!';
  res.redirect('/signin');
}



/* ===============ARTICLE CREATION AND READING=================== */

function saveArticle(user, title, article, img){
  var date = new Date();
  return funct.articleSave(user.username, title, article, img, date);
}


/*==========ARTICLE FORMATTING ================== */
function formatArticles(data, user){
  var articleView = '';


  console.log(user+ "    " + deleteFormPrototype);
  if(!data){
    articleView = "Error";
    return articleView;
  }else{
    articleView += '<div class="jumbotron">';
    for(var i = data.length-1; i >= 0; i--){

      var articlediv1 = articlediv.replace('{{header}}', data[i].title);

      //Check if article has an image
      if(data[i].image) articlediv1 = articlediv1.replace('{{imgsrc}}', data[i].image);
      else articlediv1 = articlediv1.replace('<img src={{imgsrc}} width = "100%" height = "70%"/>', '');

      articlediv1 = articlediv1.replace('{{article-content}}', data[i].article);
      var datetime = "";
      if(data[i].date) datetime = "<hr>Date: " + data[i].date.toString(); 

      articlediv1 = articlediv1.replace('{{user}}', data[i].username + " " + datetime);

      articleView += articlediv1;

      

      if(user) {
        if(user.isAdmin){
          articleView += deleteFormPrototype.replace('{{val}}', data[i].title);
        }
        if(user.username == data[i].username && !user.isAdmin){
          articleView += deleteFormPrototype.replace('{{val}}', data[i].title);
        }
      }
    }
    articleView  += '</div>';
    return articleView;
  }


}


function getLoggedUserPosts(articles, username){
  var userArticleView = '';
  if(!articles){
    return 'Error';
  }
  if(articles){
      for(var i = articles.length -1; i >= 0; i--){
 
      if(articles[i].username == username ){
     
        userArticleView += '<h1>'+articles[i].title+'</h1>';

        if(articles[i].image) userArticleView += '<img src="'+ articles[i].image +'" width = "300px" height = "300px"/>';
        userArticleView += '<p>'+articles[i].article+'</p><br><label>Creator: </label>'+articles[i].username;
        userArticleView += deleteFormPrototype.replace('{{val}}', articles[i].title) + '<hr>';
      }

    }
    return userArticleView;
  }else{
    return userArticleView;
  }

}



function changeUserAvatar(username, password, url){
  funct.updateAccount(username,password, url);
}




/*	Here is routes */
app.get('/', function(req, res){
  if(req.user){
    var articles = funct.articleSearch();
    if(!articles) res.render('home', {user: req.user});
    articles.then(function(art){
      var userArticlesView = getLoggedUserPosts(art, req.user.username);
      res.render('home', {user: req.user, posts: userArticlesView});
    });
  }else{
    res.render('home', {user: req.user});
  }
});

//displays our signup page
app.get('/signin', function(req, res){
  res.render('signin');
});


//Get articles 
app.get('/news', function(req, res){
  
  var articles = funct.articleSearch();
  articles.then(function(art){
  var arti =  formatArticles(art, req.user);
  if(arti == "Error"){
    req.session.error = 'Cannot load articles';
    res.redirect('/');
  }else{
    if(req.user){
       res.render('article', {user: req.user, article: arti}); // TEsting
    }else{
       res.render('article', {article: arti}); // TEsting
    }
   
  }

  });

});


app.post('/deletearticle', function(req,res){
  funct.articleDelete(req.body.atitle);
  res.redirect('/');
});


app.post('/changeavatar', function(req, res){

  let imageFile = req.files.avatarimage;
  imageFile.mv("./public/siteimages/" + imageFile.name, function(err){
          if(err){
            console.log("Cannot save image");
            res.redirect('/');
          }else{
            console.log(req.body.articletitle + "     " + req.body.articletext + " Image: /siteimages/" + imageFile.name);
            
            changeUserAvatar(req.user.username, req.user.password, "./public/siteimages/" + imageFile.name);
            res.redirect('/');
          }
        });

});



app.post('/postarticle', function(req, res){
  if(!req.user) res.error
    if(!req.files){
      console.log("No image: " + req.body.articletitle + "     " + req.body.articletext);
      var isSaved = saveArticle(req.user, req.body.articletitle, req.body.articletext, null);
      console.log(isSaved);
      res.redirect('/');
    }else{
        console.log("Saving article with image");
        let imageFile = req.files.articleimage;

        imageFile.mv("./public/images/" + imageFile.name, function(err){
          if(err){
            console.log("Cannot save image");
            res.redirect('/');
          }else{
            console.log(req.body.articletitle + "     " + req.body.articletext + " Image: /images/" + imageFile.name);
            var isSaved = saveArticle(req.user, req.body.articletitle, req.body.articletext, "/images/" + imageFile.name);
            console.log(isSaved);
            res.redirect('/');
          }
        });
    }
});


app.get('/create', function(req, res){
  if(!req.user) return res.redirect('/');
  res.render('createarticle', {user: req.user});
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});