var express = require('express');
var url = require('url');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var formidable = require('formidable');
var fs = require('fs');
var dl = require('delivery');
var btoa = require('btoa');
var str_replace= require('locutus/php/strings/str_replace');
var striptags= require('striptags');

// var multer = require('multer');

//  var Storage = multer.diskStorage({
//      destination: function(req, file, callback) {
//          callback(null, "images/profilePics");
//      },
//      filename: function(req, file, callback) {
//        console.log(">>>>>>>>>" + JSON.stringify(req));
//          callback(null, file.fieldname +'.'+mime.extension(file.mimetype));
//      }
//  });

// var upload = multer({storage: Storage}).array("profilepic", 5);
var dict = {//designation key value pair
  'SP': 3,
  'DSP': 2,
  'CSP': 1
};
var session = require('express-session');
var async = require('async');
var SqlString = require('sqlstring');

var app = express();
var http = require('http').Server(app)
var io = require('socket.io')(http);

var myIp = "192.168.43.28";

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');
app.use(fileUpload({preserveExtension: 3}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// app.use(upload.array());
app.use(cookieParser());
app.use(session({secret: "hamunaptra", resave: false, saveUninitialized: true}));

var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'satya',
    database: 'polproj100',
    charset: 'utf8mb4'
});
var admin = {username: "sss2017", password: "PolProj@2017"};

app.get('/admin', function(req, res){
    // console.log("SAFASFAS");
    res.render('admin.html', {message: ""});
});

app.post('/admin', function(req, res){
        // console.log(req.body.username + "   "+ req.body.password);
        if(admin.username == req.body.username && admin.password == req.body.password){
            // console.log(JSON.stringify(user) + "  -- "+JSON.stringify(req.body));
            req.session.user = admin;
            res.redirect('/protected');
            res.end();
        }else{
            //console.log("sad: "+req.body.password);
            res.render("admin.html", {message: "Wrong Username or Password!"});
        }
});

function checkAdmin(req, res, next){
    //console.log("0------> "+req.session.user.username);

    if(req.session.user.username==admin.username && req.session.user.password == admin.password){
        // console.log("ASdaf");
        next();
    }else{
        var err = new Error("Not Admin!");
        next(err);
    }
}

app.get('/protected', checkAdmin, function(req, res){
    // console.log("SADA");
    
    connection.query("SELECT * FROM Users, UserInfo WHERE Users.id=UserInfo.id;", function(err, rows, fields){
       if(err){
              throw err;
       }else{
              res.render('protected.html', {users: rows});
       }
    });
    // res.render("protected.html", {users: null});
    // res.render('protected.html');
});

app.post('/logout', function(req, res){
        req.session.destroy(function(){
            console.log("Out!");
            res.redirect('/admin');
        });
});

app.post ('/removeuser', checkAdmin, function(req, res){
  var selecteduser = req.body.removallist1;
  var values = selecteduser.split('+');
  // console.log("VALUE: ", values[0]+"-"+values[1]);
  var id = values[0];
  var userid = values[1];
  connection.query("DELETE FROM Users WHERE id="+id+";", function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From Users");
        }
 });
  connection.query("DELETE FROM UserInfo WHERE id="+id+";", function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From UserInfo");
        }
 });
var removemsgquery = "DELETE FROM messages WHERE fromID="+userid+" OR toID="+userid+";";
// console.log(">>>> "+removemsgquery);
connection.query(removemsgquery, function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From messages");
        }
 });
  res.redirect('/protected');
});

app.post('/adduser', checkAdmin, function(req, res){
       var username = req.body.user_name;
       var email = req.body.email;
       var contact = req.body.contact;
       var design = req.body.designation;
       var station = req.body.station;
       var ipaddr = req.body.ipaddr;
       var userId = req.body.userID;
       var t1mp=ipaddr.split(/[."]+/);
                   var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
      
       connection.query("INSERT INTO Users (userID, ipAddr) VALUES ("+userId+", '"+ipaddr+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
                     console.log("ADDED TO USERS");
              }
       });
       connection.query("CREATE TABLE "+d_a_ta+" (id INT AUTO_INCREMENT PRIMARY KEY,fromID INT NOT NULL,toID INT NOT NULL,insertTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,expireTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,flag int default 0,filetag VARCHAR(100),filename VARCHAR(1000),downloadlink VARCHAR(100),fileextension VARCHAR(10), comments VARCHAR(300), seen tinyint(1) NOT NULL DEFAULT 0 );", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
                     console.log(d_a_ta+"table added");
              }
       });
        connection.query("INSERT INTO UserInfo (name, email, contact, designation, station) VALUES ('"+username+"', '"+email+"', '"+contact+"', '"+design+"', '"+station+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
                     console.log("ADDED TO USERINFO");
              }
        });
       res.redirect('/protected');
});

function getUserInfo(req, ip, callback1){
       console.log("IOP: "+ip);
       async.waterfall([
              function(callback){
                     connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                             // connection.end();
                             var temp = null;
                             if(err){ 
                                 throw err;
                             }else{
                                   
                                        for (var i = rows.length - 1; i >= 0; i--) {
                                          // console.log(rows[i]);
                                               if(rows[i].ipAddr == ip){
                                                 // console.log(">>" + rows[i].ipAddr + "<  >" + ip + "<<");
                                                 allowed = true;
                                                 temp = rows[i];
                                              
                                                 break;
                                               }
                                        }
                                 
                             }
                             req.session.rowis = temp;
                             // console.log("HERE  "+temp);
                             callback();
                         });
              },
              function(callback){
                     callback1();
                     callback(null, 'DONE@@');
              }
       ], function(err, result){
              console.log("RES::" + result);
       });
}

function extractExtension(filename){
  var patt1 = /\.([0-9a-z]+)(?:[\?#]|$)/i;
       var extension1 = (filename).match(patt1);
       var extension = extension1[1];
       return extension;
}

function getImageFileName(req, row, callback){
       var dirn = 'images/profilePics/';
       var done = false;
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     if(file.match(new RegExp('^[0-9]*')) == row.userID){
                            req.session.imagefile = file;
                            done = true;
                     }
              });
              if(done==false){
                req.session.imagefile = "0.png";
              }
              callback();
       });
}

function _arrayBufferToBase64( buffer ) {
      var binary = '';
      var bytes = new Uint8Array( buffer );
      var len = bytes.byteLength;
      for (var i = 0; i < len; i++) {
          binary += String.fromCharCode( bytes[ i ] );
      }
      return btoa( binary );
  }

function homeMaker(req, res){
        console.log("jfsskjbdfcskdjfxckbbxl");
        console.log(req.connection.remoteAddress);
       var ip = req.connection.remoteAddress;
       console.log(">>>>>>>>"+ip);
       var allowed = false;
       var done = false;
       async.waterfall([
        function(callback){
                // console.log("1111111111111");
                console.log("in chat"+JSON.stringify(req.session.rowis));
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
        function(callback){
                connection.query('SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";', function(err, rows, fields){
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allmessages = rows;
                       
                       callback();
                   }
               });
              },
        function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
       },
       function(callback){
                var t1mp=req.session.rowis.ipAddr.split(/[."]+/);
                var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
                
                var queryToRun = 'SELECT * from '+d_a_ta+'';
                // console.log(">>  "+queryToRun);
                connection.query(queryToRun, function(err, rows, fields){
                     if(err){ 
                         throw err;
                     }else{
                        // console.log(JSON.stringify(rows));
                        var newmails = [];
                        var workingmails = [];
                        var donemails = [];
                        var sendmails = [];
                         for(var i=0; i<rows.length; i++){
                          if(rows[i].fromID == req.session.rowis.userID){
                            sendmails.push(rows[i]);
                          }
                          else if(rows[i].seen==0 && rows[i].toID == req.session.rowis.userID){
                            newmails.push(rows[i]);
                          }else if(rows[i].flag == 0 && rows[i].toID == req.session.rowis.userID){
                            workingmails.push(rows[i]);
                          }else{
                            donemails.push(rows[i]);
                          }
                         }
                         req.session.newmails = newmails;
                         req.session.workingmails = workingmails;
                         req.session.donemails = donemails;
                         req.session.sendmails = sendmails;
                         callback();
                     }
                 });
       },function(next){
        // console.log(">>>>>111111111111111111111");
              // connection.connect();
           connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
               // connection.end();
               var temp = null;
               if(err){ 
                   throw err;
               }else{
                  if(rows.length==0){
                        res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                  }
                    
                          for (var i = rows.length - 1; i >= 0; i--) {
                            // console.log(rows[i]);
                                 if(rows[i].ipAddr == ip){
                                   // console.log(">>" + rows[i].ipAddr + "<  >" + ip + "<<");
                                   allowed = true;
                                   temp = rows[i];
                                   // next(null, res, allowed);
                                   // console.log("HERE>>>>>>");
                                   break;
                                 }
                          }
                   
                   req.session.rowis = temp;
                   console.log(dict[req.session.rowis.designation]);
                   next(null, res, allowed, temp);
               }
           });
    }, function(res, allowed, row, callback){
        // console.log(">>>>>222222222222222222");

              if(allowed==true){
                            var dirn = 'images/profilePics/';
                            fs.readdir(dirn, (err, files) => {
                                   files.forEach(file => {
                                          if(file.match(new RegExp('^[0-9]*')) == row.userID){
                                                res.render('profile-page.html', {row: row, filenameFull: file,allrows:req.session.allrows,allmsgs:req.session.allmessages,donemails:req.session.donemails, workingmails:req.session.workingmails, newmails:req.session.newmails, sendmails: req.session.sendmails});
                                                done = true;
                                          }
                                   });
                                   if(done==false){
                                      return res.render('profile-page.html', {row: row, filenameFull: "0.png",allrows:req.session.allrows,allmsgs:req.session.allmessages,donemails:req.session.donemails, workingmails:req.session.workingmails, newmails:req.session.newmails, sendmails: req.session.sendmails});
                                   }
                            });
                            // res.render('index.html', {row: row, filenameFull: ""});
                  }else{
                            res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                  }
                  callback(null, "Done");
           }], function(err, result){
              console.log("RES-> "+result);
           });
}

app.get('/images/:userip/:name', function(req, res){
  res.sendFile('/images/' + req.params.userip + '/' + req.params.name, {root: __dirname});
});

app.get('/', function(req, res){
       homeMaker(req, res);
});

app.get('/images/profilePics/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/profilePics/'+req.params.name, {root: __dirname});
});

app.get('/images/tempfiles/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/tempfiles/'+req.params.name, {root: __dirname});
});

app.get('/images/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('images/'+req.params.name, {root: __dirname});
});

app.get('/bootstrap-3.3.7/dist/js/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('bootstrap-3.3.7/dist/js/'+req.params.name, {root: __dirname});
});

app.get('/fonts/roboto/:name', function(req, res){
    // res.send('images/'+req.params.name);
    // console.log("ASDADDASDAS>>>>>>>>>>>>>>>>>>>>>>>>>>>   " + req.params.name);
    res.sendFile('fonts/roboto/'+req.params.name, {root: __dirname});
});

app.get('/views/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('views/'+req.params.name, {root: __dirname});
});

app.get('/css/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('css/'+req.params.name, {root: __dirname});
});

app.get('/js/:name', function(req, res){
    // res.send('images/'+req.params.name);
    res.sendFile('js/'+req.params.name, {root: __dirname});
});
app.get('/assets/img/:name',function(req,res){
  res.sendFile('assets/img/'+req.params.name, {root: __dirname});
});
app.get('/assets/img/examples/:name',function(req,res){
  res.sendFile('assets/img/examples/'+req.params.name, {root: __dirname});
});

app.get('/assets/css/:name',function(req,res){
  res.sendFile('assets/css/'+req.params.name, {root: __dirname});
});

app.get('/assets/js/:name',function(req,res){
  res.sendFile('assets/js/'+req.params.name, {root: __dirname});
});


app.get('/assets/css/:name',function(req,res){
  res.sendFile('assets/css/'+req.params.name, {root: __dirname});
});

app.get('/assets/js/:name',function(req,res){
  res.sendFile('assets/js/'+req.params.name, {root: __dirname});
});

app.get('/home*', function(req, res){
       // res.render('index.html');
       homeMaker(req, res);
});

app.get('/message*', function(req, res){
       async.waterfall([
              function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                     res.render('base.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, pageToGet: 'message'});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.get('/contacts', function(req, res){
    async.waterfall([
              function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                     res.render('base.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, pageToGet: 'contact'});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});

app.get('/chat*', function(req, res){
       async.waterfall([
              function(callback){
                // console.log("1111111111111");
                console.log("in chat"+JSON.stringify(req.session.rowis));
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                connection.query('SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";', function(err, rows, fields){
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allmessages = rows;
                       
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                    // console.log("????????  >> " +JSON.stringify(req.session.allrows));
                     res.render('profile-chat.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, allmsgs: req.session.allmessages});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});
app.get('/work*', function(req, res){
       async.waterfall([
              function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                // console.log("2222222222222222222");
                     if(!req.session.rowis){
                            res.status(403).send("Not Authorized!");
                            return res.end();
                          }
                     if(!req.session.imagefile)
                            getImageFileName(req, req.session.rowis, callback);
                          else
                            callback();
              },
              function(callback){
                var t1mp=req.session.rowis.ipAddr.split(/[."]+/);
                   req.session.pdb="a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3]+"a"+t1mp[4];
                connection.query('SELECT * from '+req.session.pdb+';', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.alldata = rows;
                       callback();
                   }
               });
              },
              function(callback){

                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   // connection.end();
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                // console.log("33333333333");
                    // console.log("????????  >> " +JSON.stringify(req.session.allrows));
                     res.render('form.html', {row: req.session.rowis, filenameFull: req.session.imagefile, allrows: req.session.allrows, alldata: req.session.alldata});
                     callback(null, 'DONE!');
              }
       ], function(err, result){
              console.log("RES : "+result);
       });
});


app.post('/picchange*', function(req, res){
      var userID = req.body.userID;
       var user_name='"'+req.body.user_name+'"';
       var email='"'+req.body.email+'"';
       var contact='"'+req.body.contact+'"';
       var bio='"'+req.body.bio+'"';
       console.log(bio);
        var queryToRun="update Users, UserInfo set name="+user_name+",email="+email+",contact="+contact+",bio="+bio+" where Users.id=UserInfo.id AND userID="+userID+";";
            connection.query(queryToRun, function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("Profile UPdated");
                 }
                 
             });
            
      if(typeof(req.files.profilePicUpload)=="undefined")
        res.redirect('/');
       let sampleFile = req.files.profilePicUpload;
       var mime1 = sampleFile.mimetype;
       var re = new RegExp('image/(.*)');
       var extension1 = mime1.match(re);
       // console.log(">>>>>>>>>>>>  "+extension1[1]);
       var dirn = 'images/profilePics/';
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     console.log(">>>>>>>>>>>>>>>  " + file.match(new RegExp('^[0-9]*')));
                     if(file.match(new RegExp('^[0-9]*')) == userID){
                            // console.log(">> ** ", file);
                            fs.unlink(dirn +''+ file, (err) => {
                                   if(err) throw err;
                                   console.log('DELETED FILE -> ' + dirn+''+file);
                            });
                     }
              });
              sampleFile.mv('images/profilePics/'+userID+'.'+extension1[1], function(err) {
                     if (err){
                            return res.status(500).send(err);
                     }
                     res.redirect('/');
                     });
              });
     });
var randomString=function () {
  length=5;
  var chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
var sanitise=function (string){
  var strip = ["~", "`", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "=", "+", "[", "{", "]",
                     "}", "\\", "|", ";", ":", "\"", "'", "&#8216;", "&#8217;", "&#8220;", "&#8221;", "&#8211;", "&#8212;",
                     "â€”", "â€“", ",", "<", ">", "/", "?"];
  var clean = str_replace(strip, "", striptags(string)).trim();
      clean = clean.replace(/\s+/g, '-').toLowerCase();
      clean =clean.replace(/[^a-z0-9/-]/gi,'');
  return clean;
} 
app.post('/checkip', function(req, res){
    connection.query('SELECT * from Users;', function(err, rows, fields){
       if(err){ 
           throw err;
       }else{
          res.send(JSON.stringify({iprows: rows}));
       }
   });
});

function removeQuotes(string){
  var i=0;
  var ans = "";
  while(string[i]!="'"){
    i++;
  }
  var j = string.length-1;
  while(string[j]!="'"){
    j--;
  }
  ans = string.substring(i+1,j);
  return ans;
}

  io.on('connection', function(socket){
    socket.on('read mails', function(msg){
      var donewith = msg.donereading;
      for(var i=0; i<donewith.length; i++){
        var id = donewith[i];
        var t1mp=msg.fromRow.ipAddr.split(/[."]+/);
        var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
        var queryToRun = "UPDATE "+d_a_ta+" SET seen=1 where toID="+msg.fromRow.userID+" AND id="+id+";";
        connection.query(queryToRun,function(err, da){
             if(err){ 
                 throw err;
             }else{
                   console.log("UPDATED SEEN : " + msg.fromRow.userID);
             }
         });
        // console.log(">>$$$$$$$$$$$$$$$$$$$$ >>>>>>>>>>>>DATA "+d_a_ta);
      }
    });
    socket.on('completed mail',function(msg){
      var id = msg.completed;
        var t1mp=msg.fromRow.ipAddr.split(/[."]+/);
        var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
        var queryToRun = "UPDATE "+d_a_ta+" SET flag=1 where toID="+msg.fromRow.userID+" AND id="+id+";";
        connection.query(queryToRun,function(err, da){
             if(err){ 
                 throw err;
             }else{
                   console.log("UPDATED SEEN : " + msg.fromRow.userID);
             }
         });
        // console.log(">>$$$$$$$$$$$$$$$$$$$$ >>>>>>>>>>>>DATA "+d_a_ta);
    });
    socket.on('seen',function(msg){
      io.emit('seen', msg);
    });
    socket.on('_chat', function(msg){
      if(msg.image){
        var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
        msg.dateToInsert = dateToInsert;
        var storeFilename = msg.frominfo.userID+'_'+msg.toinfo.userID+'_'+dateToInsert.replace(' ','-')+'.'+extractExtension(msg.filename);
       // console.log("QQQQQQQQ>>>>>>>>  "+JSON.stringify(extension1[1]));
             fs.writeFileSync(__dirname + '/images/tempfiles/' + storeFilename,msg.buffer, function(err){
              if(err){
                console.log("ERROR!!!!!!!!!!");
              }
             });
          // console.log(">>>>>>>>>>>> 123  >> "+removeQuotes(SqlString.escape(msg.buffer)));
            // var queryToRun = 'INSERT INTO messages (fromID, toID, timeOfMsg, isImg, img, imgname) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+dateToInsert+'", 1, "'+removeQuotes(SqlString.escape(msg.buffer))+'", "'+msg.filename+'");';
            var queryToRun = "INSERT INTO messages SET ?";
            var values = {
              message: '',
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              timeOfMsg: dateToInsert,
              isImg: 1,
              img: storeFilename,
              imgname: msg.filename
            };
            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED IMAGE : " + msg.filename);
                 }
             });
            io.emit('_chat', msg);
      }else{
            var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
            // var queryToRun = 'INSERT INTO messages (fromID, toID, message, timeOfMsg, isImg) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+(SqlString.escape(msg.message)).substring(1,(SqlString.escape(msg.message)).length -1) +'", "'+dateToInsert+'", 0);';
            var queryToRun = 'INSERT INTO messages (fromID, toID, message, timeOfMsg, isImg) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+removeQuotes(SqlString.escape(msg.message)) +'", "'+dateToInsert+'", 0);';
            connection.query(queryToRun, function(err, rows, fields){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED MESSAGE : " + msg.message);
                 }
             });
            io.emit('_chat', msg);
          }
    });
    socket.on('file message', function(msg){
        // msg.filename=sanitise(msg.filename);
        var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
        var date= new Date();
        msg.dateToInsert=dateToInsert;
        var expiryDate = date.setDate(date.getDate() + parseInt(msg.expiry));
        var expiryDateFinal = new Date(expiryDate).toISOString().slice(0, 19).replace('T', ' ');
        //console.log(tomorrow)
        msg.dateToInsert = dateToInsert;
        var storeFilename = randomString()+'.'+extractExtension(msg.filename);
       // console.log("QQQQQQQQ>>>>>>>>  "+JSON.stringify(extension1[1]));
              var dir=__dirname + '/images/common/';
              if (!fs.existsSync(dir)){//if dir not exists create directory
                  fs.mkdirSync(dir);
              }
             fs.writeFileSync(dir + storeFilename,msg.buffer, function(err){
              if(err){
                console.log("ERROR!!!!!!!!!!");
              }
             });
             msg.downloadlink=dir + storeFilename;
          // console.log(">>>>>>>>>>>> 123  >> "+removeQuotes(SqlString.escape(msg.buffer)));
            var queryToRun = "INSERT INTO common SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              insertTime: dateToInsert,
              expireTime:expiryDateFinal,
              flag:0,
              filetag:msg.tag,
              filename:msg.filename,
              downloadlink:'/images/common/' + storeFilename,
              fileextension:extractExtension(msg.filename),
              comments: msg.comment,
              rank:dict[msg.frominfo.designation]>dict[msg.toinfo.designation]?dict[msg.toinfo.designation]:dict[msg.frominfo.designation]
            };
            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED IMAGE : " + msg.filename);
                 }
             });
            console.log(">>>>>  "+ JSON.stringify(values));
            var t1mp=msg.frominfo.ipAddr.split(/[."]+/);
            var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
          //   console.log(">>> DATA name : "+d_a_ta);
            var dir=__dirname + '/images/'+d_a_ta+'/';
              if (!fs.existsSync(dir)){//if dir not exists create directory
                  fs.mkdirSync(dir);
              }
             fs.writeFileSync(dir + storeFilename,msg.buffer, function(err){
              if(err){
                console.log("ERROR!!!!!!!!!!");
              }
             });
             msg.downloadlink=dir + storeFilename;
          // console.log(">>>>>>>>>>>> 123  >> "+removeQuotes(SqlString.escape(msg.buffer)));
            // var queryToRun = 'INSERT INTO messages (fromID, toID, timeOfMsg, isImg, img, imgname) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+dateToInsert+'", 1, "'+removeQuotes(SqlString.escape(msg.buffer))+'", "'+msg.filename+'");';
            var queryToRun = "INSERT INTO "+d_a_ta+" SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              insertTime: dateToInsert,
              expireTime:expiryDateFinal,
              flag:0,
              filetag:msg.tag,
              filename:msg.filename,
              comments: msg.comment,
              downloadlink:'/images/'+d_a_ta+'/' + storeFilename,
              fileextension:extractExtension(msg.filename)
            };
            console.log(">>>>>  NOT COMMON "+ JSON.stringify(values));

            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED IMAGE : " + msg.filename);
                 }
             });


            t1mp=msg.toinfo.ipAddr.split(/[."]+/);
            d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
            console.log(">>> DATA name : "+d_a_ta);
            dir=__dirname + '/images/'+d_a_ta+'/';
              if (!fs.existsSync(dir)){//if dir not exists create directory
                  fs.mkdirSync(dir);
              }
             fs.writeFileSync(dir + storeFilename,msg.buffer, function(err){
              if(err){
                console.log("ERROR!!!!!!!!!!");
              }
             });
             msg.downloadlink=dir + storeFilename;
          // console.log(">>>>>>>>>>>> 123  >> "+removeQuotes(SqlString.escape(msg.buffer)));
            // var queryToRun = 'INSERT INTO messages (fromID, toID, timeOfMsg, isImg, img, imgname) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+dateToInsert+'", 1, "'+removeQuotes(SqlString.escape(msg.buffer))+'", "'+msg.filename+'");';
            var queryToRun = "INSERT INTO "+d_a_ta+" SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              insertTime: dateToInsert,
              expireTime:expiryDateFinal,
              flag:0,
              filetag:msg.tag,
              filename:msg.filename,
              comments: msg.comment,
              downloadlink:'/images/'+d_a_ta+'/' + storeFilename,
              fileextension:extractExtension(msg.filename)
            };
            console.log(">>>>>  NOT COMMON "+ JSON.stringify(values));

            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                       console.log("INSERTED IMAGE : " + msg.filename);
                 }
             });



            io.emit('file message', msg);
      
    });
  });

  app.post('/getmsgdata', function(req, res){
    // // console.log("GET MESSAGE DATA>>>>>>  "+req.session.rowis.userID);
    // var queryToRun = 'SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";';
    // // console.log(">>  "+queryToRun);
    // connection.query(queryToRun, function(err, rows, fields){
    //      if(err){ 
    //          throw err;
    //      }else{
    //         // console.log(JSON.stringify(rows));
    //          res.send(JSON.stringify({rows: rows}));
    //      }
    //  });
  console.log(">>>>>>>>>> REQUEST");
    var fromRow = req.body.rowFrom;
    var toRow = req.body.rowTo;
    async.waterfall([
       function(callback){
                // console.log("1111111111111");
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
        function(callback){
          if(fromRow!=null){
          var queryToRun = "UPDATE messages SET seen=1 WHERE toID='"+fromRow.userID+"';"
          connection.query(queryToRun, function(err, rows, fields){
               if(err){ 
                   throw err;
                   res.send("");
               }else{
                callback();
                  // console.log(JSON.stringify(rows));
               }
           });
        }else{
          console.log(">>>>>>>>>>>>>>>> HRER");
          callback();
        }
        },
        function(callback){
          var queryToRun = 'SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";';
          // console.log(">>  "+queryToRun);
          connection.query(queryToRun, function(err, rows, fields){
               if(err){ 
                   throw err;
                   res.send("");
               }else{
                  // console.log(JSON.stringify(rows));
                   res.send(JSON.stringify({rows: rows}));
                   callback(null, 'HOLA! RES');
               }
           });
        }
      ], function(err, result){
              console.log("NOTIFICATION :"+result);
       });

  });
  app.post('/getcommondata', function(req, res){
    // console.log("GET MESSAGE DATA>>>>>>  "+req.session.rowis.userID);
    var rank=dict[re.session.rowis.designation];
    var queryToRun = 'SELECT * from common WHERE rank > '+rank+' or rank = '+rank+' ';
    // console.log(">>  "+queryToRun);
    connection.query(queryToRun, function(err, rows, fields){
         if(err){ 
             throw err;
         }else{
            // console.log(JSON.stringify(rows));
             res.send(JSON.stringify({rows: rows}));
         }
     });
  });
app.post('/getprivatedata', function(req, res){
    // console.log("GET MESSAGE DATA>>>>>>  "+req.session.rowis.userID);
    var t1mp=req.session.rowis.ipAddr.split(/[."]+/);
    var d_a_ta="a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3]+"a"+t1mp[4];
    
    var queryToRun = 'SELECT * from '+d_a_ta+'';
    // console.log(">>  "+queryToRun);
    connection.query(queryToRun, function(err, rows, fields){
         if(err){ 
             throw err;
         }else{
            // console.log(JSON.stringify(rows));
             res.send(JSON.stringify({rows: rows}));
         }
     });
  });
app.get('/docs/:name', function(req, res){
    res.sendFile('/docs/'+req.params.name, {root: __dirname});
});

// app.listen(process.env.PORT || 3000, myIp);
// server.listen(process.env.PORT || 3000, myIp);
http.listen(7000,'127.0.0.1', function(){
  console.log('listening on *:3000');
  http.close(function(){
    http.listen(3000, myIp);
  });
});