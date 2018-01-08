var express = require('express');
var url = require('url');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var formidable = require('formidable');
var fs = require('fs');
var dl = require('delivery');
var btoa = require('btoa');
var logger = require('morgan');
var schedule = require('node-schedule');
var path = require('path');
var dict = {
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
var logger = require('express-logger');
app.use(logger({path: "./app.log"}));
var myIp = "127.0.0.1";
app.set('views',path.join(__dirname,'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(fileUpload({preserveExtension: 3}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({secret: "hamunaptra", resave: false, saveUninitialized: true}));
app.use(express.static(path.join(__dirname, 'public')));
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'hamunaptra',
    database: 'polproj100',
    charset: 'utf8mb4'
});
var admin = {username: "sss2017", password: "PolProj@2017"};
var eventvar=0;
function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; 
        }
    });
}
app.get('/admin', function(req, res){
    res.render('admin.html', {message: ""});
});
app.post('/admin', function(req, res){
        if(admin.username == req.body.username && admin.password == req.body.password){
            req.session.user = admin;
            res.redirect('/protected');
            res.end();
        }else{
            res.render("admin.html", {message: "Wrong Username or Password!"});
        }
});
function checkAdmin(req, res, next){
       if(!req.session.user){
              res.render('admin.html', {message: "Login First"});
              return;
       }
    if(req.session.user.username==admin.username && req.session.user.password == admin.password){
        next();
    }else{
        res.render('admin.html', {message: "Login First"});
    }
}
app.get('/protected', checkAdmin, function(req, res){
    var prev_query = "CREATE TABLE IF NOT EXISTS Users (id INT PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, ipAddr VARCHAR(16) NOT NULL);";
    connection.query(prev_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
           }
       });
    var next_query = "CREATE TABLE IF NOT EXISTS UserInfo (id INT PRIMARY KEY AUTO_INCREMENT, name varchar(30) NOT NULL, email VARCHAR(40) NOT NULL, contact varchar(15) NOT NULL, designation varchar(20) NOT NULL, bio VARCHAR(300));";
    connection.query(next_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
           }
       });
    connection.query("SELECT * FROM Users, UserInfo WHERE Users.id=UserInfo.id;", function(err, rows, fields){
       if(err){
              throw err;
       }else{
              res.render('protected.html', {users: rows, designations: dict});
       }
    });
});
app.post('/logout', function(req, res){
        req.session.destroy(function(){
            res.redirect('/admin');
        });
});
app.post ('/removeuser', checkAdmin, function(req, res){
  var id = req.body.I;
  var userid = req.body.ID;
  var ipaddr = req.body.ip_addr;
  connection.query("DELETE FROM Users WHERE id='"+id+"';", function(err, rows, fields){
        if(err){
               throw err;
        }else{
        }
 });
  connection.query("DELETE FROM UserInfo WHERE id='"+id+"';", function(err, rows, fields){
        if(err){
               throw err;
        }else{
        }
 });
var removemsgquery = "DELETE FROM messages WHERE fromID='"+userid+"' OR toID='"+userid+"';";
connection.query(removemsgquery, function(err, rows, fields){
        if(err){
               throw err;
        }else{
        }
 });
var dirn = 'images/profilePics/';
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     if(file.match(new RegExp('^[0-9]*')) == userid){
                            fs.unlink(dirn +''+ file, (err) => {
                                   if(err) throw err;
                            });
                     }
              });
       });
  res.redirect('/protected');
});
app.post('/adduser', checkAdmin, function(req, res){
       var username = req.body.user_name;
       var email = req.body.email;
       var contact = req.body.contact;
       var design = req.body.designation;
       var ipaddr = req.body.ipaddr;
       var userId = req.body.userID;
       var t1mp=ipaddr.split(/[."]+/);
                   var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
       connection.query("INSERT INTO Users (userID, ipAddr) VALUES ("+userId+", '"+ipaddr+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
              }
       });
       connection.query("CREATE TABLE if not exists "+d_a_ta+" (id INT(64) AUTO_INCREMENT PRIMARY KEY,fromID INT NOT NULL,toID INT NOT NULL,insertTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,expireTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,flag tinyint(1) default 0,filetag VARCHAR(100),filename VARCHAR(300),downloadlink VARCHAR(100),fileextension VARCHAR(15), comments VARCHAR(300), seen tinyint(1) NOT NULL DEFAULT 0 );", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
              }
       });
        connection.query("INSERT INTO UserInfo (name, email, contact, designation) VALUES ('"+username+"', '"+email+"', '"+contact+"', '"+design+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
              }
        });
       res.redirect('/protected');
});
app.get('/events',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  var ipadd = '"' + req.connection.remoteAddress + '"';
  connection.query("SELECT * from Users where ipAddr="+ipadd+";", function(err,rows,fields){
    var userID = rows[0].userID;
  });
  var prev_query = "CREATE TABLE IF NOT EXISTS "+ tablename+" (ID INT(64) PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, NAME VARCHAR(50) NOT NULL , DATE VARCHAR(20) NOT NULL, MESSAGE VARCHAR(300));";
  connection.query(prev_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
           }
       });
  connection.query("SELECT * FROM " + tablename + " ORDER BY DATE;", function(err, rows, fields){
       if(err){
              throw err;
       }else{
              res.render('events.html', {users: rows, dates: null});
       }
    });
});
var process = function(allips, x){
  if(x<allips.length){
    var tzoffset = (new Date()).getTimezoneOffset() * 60000
    var tablename = "e"+((allips[x].replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
    var curr_date = new Date(Date.now()-tzoffset).toISOString().slice(0, 19).replace('T', ' ');
    var prev_query = "CREATE TABLE IF NOT EXISTS "+ tablename+" (ID INT(64) PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, NAME VARCHAR(50) NOT NULL , DATE VARCHAR(20) NOT NULL, MESSAGE VARCHAR(300));";
    connection.query(prev_query, function(err, rows, fields){
             if(err){ 
                 throw err;
             }else{
             }
         });
    connection.query("select * from "+ tablename +" WHERE DATE >= NOW() order by DATE ASC;", function(err,rows,fields){
      if(err){
        throw err;
      }else{
        for(var i = 0; i < rows.length; i++){
          if(rows[i].DATE === curr_date){
            io.emit('message intranet', {info: rows[i], ip: allips[x]});
          }else{
            break;
          }
        }
        process(allips, x+1);
      }
    });
  }
}
var j = schedule.scheduleJob('00 * * * * *', function(){
  var allips = [];
  async.waterfall([function(callback){
    var queryToRun = "SELECT * from Users;";
    connection.query(queryToRun, function(err, rows, fields){
      if(err){
        throw err;
      }else{
        for(var i=0; i<rows.length; i++){
          allips.push(rows[i].ipAddr);
        }
        callback();
      }
    });  
  },
  function(callback){
    process(allips, 0);
    callback(null, "FINAL!!")
  }],function(err, result){
  });
});
app.get('/search', function(req, res){
  async.waterfall([
              function(callback){
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
              function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allrows = rows;
                       callback();
                   }
               });
              },
              function(callback){
                     var rank=dict[req.session.rowis.designation];
                    var queryToRun = 'SELECT * from common WHERE rank <= '+rank+';';
                    var row = req.session.rowis;
                    connection.query(queryToRun, function(err, rows, fields){
                         if(err){ 
                             throw err;
                         }else{
                             var dirn = 'images/profilePics/';
                                   fs.readdir(dirn, (err, files) => {
                                          var done = false;
                                          files.forEach(file => {
                                                 if(file.match(new RegExp('^[0-9]*')) == row.userID){
                                                        res.render('search.html', {filesSent: rows, row: req.session.rowis, filenameFull: file, allrows: req.session.allrows});
                                                        done = true;
                                                 }
                                          });
                                          if(done==false){
                                                 res.render('search.html', {filesSent: rows, row: req.session.rowis, filenameFull: "0.png", allrows: req.session.allrows});
                                          }
                                   });
                         }
                     });
              }
       ], function(err, result){
       });
})
app.post('/changedate',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  var ipadd = '"' + req.connection.remoteAddress + '"';
  var year = req.body.change.slice(6,10);
    var month = req.body.change.slice(0,2);
    var Day = req.body.change.slice(3,5);
    var currr_date=new Date(year,month-1,Day,00,00,0);
    var curr_date = new Date(currr_date.getTime()-(currr_date.getTimezoneOffset()*60000)).toISOString().slice(0, 19).replace('T', '  ');
    connection.query("select * from "+ tablename +" WHERE DATE(DATE) = '"+curr_date+"' order by DATE ASC;", function(err,rows,fields){
    if(err){
      throw err;
    }else{
      res.render('events.html', {users: rows, dates: {thisDay: curr_date}});
    }
  });
});
app.post('/addevents',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  var ipadd = '"' + req.connection.remoteAddress + '"';
      var curr_message = req.body.message;
    var curr_name = req.body.Name;
    var year = req.body.DATE.slice(0,4);
    var month = req.body.DATE.slice(5,7);
    var Day = req.body.DATE.slice(8,10);
    var hour = req.body.TIME.slice(0,2);
    var minute = req.body.TIME.slice(3,5);
    var currr_date=new Date(year,month-1,Day,hour,minute,0);
    var curr_date = new Date(currr_date.getTime()-(currr_date.getTimezoneOffset()*60000)).toISOString().slice(0, 19).replace('T', ' ');
  connection.query("SELECT * from Users where ipAddr="+ipadd+";", function(err,rows,fields){
       if(err){
              throw err;
       }else{
              var iduser = rows[0].userID;
              var prev_query = "CREATE TABLE IF NOT EXISTS " + tablename + "(ID INT(64) PRIMARY KEY AUTO_INCREMENT,userID INT NOT NULL, NAME VARCHAR(50) NOT NULL , DATE VARCHAR(20) NOT NULL, MESSAGE VARCHAR(300) NOT NULL);";
              connection.query(prev_query, function(err, rows, fields){
                     if(err){ 
                              throw err;
                     }else{
                     }
              });
              connection.query("INSERT INTO "+ tablename +" (userID, NAME , DATE, MESSAGE) VALUES ('"+iduser+"', '"+mysql_real_escape_string(curr_name)+"', '"+curr_date+"', '"+mysql_real_escape_string(curr_message)+"');", function(err, rows, fields){
                     if(err){
                            throw err;
                     }else{
                     }
              });
       }
  });
    res.redirect('/events');
});
app.post('/deleteEvent',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  var i = req.body.I;
  connection.query("DELETE from "+ tablename +" WHERE ID=" + i + ";", function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
           }
       });
  res.redirect('/events');
});
app.post('/today',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  eventvar=0;
  var prev_query = "Select * from "+tablename+"  WHERE DATE >= CURDATE()-INTERVAL 1 DAY AND DATE <= CURDATE()+INTERVAL 7 DAY  ORDER BY DATE;";
  connection.query(prev_query, function(err,rows,fields){
    if(err){
      throw(err);
    }else{
      res.render('events.html',{users:rows, dates: {start: new Date().toISOString().slice(0, 19).replace('T', ' '), end: (new Date((new Date()).setDate((new Date()).getDate() + parseInt(7)))).toISOString().slice(0, 19).replace('T', ' ')}});
    }
  });
});
app.post('/goleft',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  eventvar=eventvar-1;
  var l= -eventvar*7-1; var r=(eventvar+1)*7;
  var prev_query = "Select * from "+tablename+" WHERE DATE >= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())+"+l+" DAY AND date <= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())-"+r+" DAY  ORDER BY DATE;";
  connection.query(prev_query, function(err,rows,fields){
    if(err){
      throw(err);
    }else{
      res.render('events.html',{users:rows, dates: {start: (new Date((new Date()).setDate((new Date()).getDate() - parseInt(l)))).toISOString().slice(0, 19).replace('T', ' '), end:  (new Date((new Date()).setDate((new Date()).getDate() + parseInt(r)))).toISOString().slice(0, 19).replace('T', ' ')}});
    }
  });
});
app.post('/goright',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  eventvar=eventvar+1;
  var l=1+eventvar*7; var r=(eventvar+1)*7;
  var prev_query = "Select * from "+tablename+" WHERE DATE >= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())-"+l+" DAY AND date <= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())-"+r+" DAY  ORDER BY DATE;";
  connection.query(prev_query, function(err,rows,fields){
    if(err){
      throw(err);
    }else{
      res.render('events.html',{users:rows, dates: {start: (new Date((new Date()).setDate((new Date()).getDate() + parseInt(l)))).toISOString().slice(0, 19).replace('T', ' '), end:  (new Date((new Date()).setDate((new Date()).getDate() + parseInt(r)))).toISOString().slice(0, 19).replace('T', ' ')}});
    }
  });
});
function getUserInfo(req, ip, callback1){
       async.waterfall([
              function(callback){
                     connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
                             var temp = null;
                             if(err){ 
                                 throw err;
                             }else{
                                        for (var i = rows.length - 1; i >= 0; i--) {
                                               if(rows[i].ipAddr == ip){
                                                 allowed = true;
                                                 temp = rows[i];
                                                 break;
                                               }
                                        }
                             }
                             req.session.rowis = temp;
                             callback();
                         });
              },
              function(callback){
                     callback1();
                     callback(null, 'DONE@@');
              }
       ], function(err, result){
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
       var ip = req.connection.remoteAddress;
       var allowed = false;
       var done = false;
       async.waterfall([
        function(callback){
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
        function(callback){
              if(req.session.rowis){
                connection.query('SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";', function(err, rows, fields){
                   if(err){ 
                       throw err;
                   }else{
                       req.session.allmessages = rows;
                       callback();
                   }
               });
         }else{
              res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
         }
              },
        function(callback){
                connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
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
                var queryToRun = "SHOW TABLES LIKE '"+d_a_ta+"';";
                connection.query(queryToRun, function(err, rows, fields){
                     if(err){
                            throw err;
                     }else{
                            if(rows.length > 0){
                                   var queryToRun = 'SELECT * from '+d_a_ta+'';
                                     connection.query(queryToRun, function(err, rows, fields){
                                          if(err){ 
                                              throw err;
                                          }else{
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
                              }else{
                                   res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                              }
                     }
                });
                
       },function(next){
           connection.query('SELECT * from Users, UserInfo WHERE Users.id=UserInfo.id;', function(err, rows, fields){
               var temp = null;
               if(err){ 
                   throw err;
               }else{
                  if(rows.length==0){
                        res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                  }
                          for (var i = rows.length - 1; i >= 0; i--) {
                                 if(rows[i].ipAddr == ip){
                                   allowed = true;
                                   temp = rows[i];
                                   break;
                                 }
                          }
                   req.session.rowis = temp;
                   next(null, res, allowed, temp);
               }
           });
    }, function(res, allowed, row, callback){
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
                  }else{
                            res.status(403).send("You Are Not Authorized To View This Page ! Please contact the administrator.");
                  }
                  callback(null, "Done");
           }], function(err, result){
           });
}
app.get('/images/:userip/:name', function(req, res){
  res.sendFile('/images/' + req.params.userip + '/' + req.params.name, {root: __dirname});
});
app.get('/', function(req, res){
       homeMaker(req, res);
});
app.get('/images/profilePics/:name', function(req, res){
    res.sendFile('images/profilePics/'+req.params.name, {root: __dirname});
});
app.get('/images/tempfiles/:name', function(req, res){
    res.sendFile('images/tempfiles/'+req.params.name, {root: __dirname});
});
app.get('/images/:name', function(req, res){
    res.sendFile('images/'+req.params.name, {root: __dirname});
});
app.get('/bootstrap-3.3.7/dist/js/:name', function(req, res){
    res.sendFile('bootstrap-3.3.7/dist/js/'+req.params.name, {root: __dirname});
});
app.get('/fonts/roboto/:name', function(req, res){
    res.sendFile('fonts/roboto/'+req.params.name, {root: __dirname});
});
app.get('/views/:name', function(req, res){
    res.sendFile('views/'+req.params.name, {root: __dirname});
});
app.get('/css/:name', function(req, res){
    res.sendFile('css/'+req.params.name, {root: __dirname});
});
app.get('/js/:name', function(req, res){
    res.sendFile('js/'+req.params.name, {root: __dirname});
});
app.get('/assets/img/examples/:name',function(req,res){
  res.sendFile('assets/img/examples/'+req.params.name, {root: __dirname});
});
app.get('/assets/img/:name',function(req,res){
  res.sendFile(path.join(__dirname, '/assets/img', req.params.name));
});
app.get('/assets/css/:name',function(req,res){
  res.sendFile(path.join(__dirname, '/assets/css', req.params.name));
});
app.get('/assets/js/:name',function(req,res){
  res.sendFile(path.join(__dirname, '/assets/js', req.params.name));
});
app.get('/home*', function(req, res){
       homeMaker(req, res);
});


app.post('/tablemaker', checkAdmin, function(req,res){
       // var query1 = "DROP TABLE IF EXISTS Users;";
       var query2 = "CREATE TABLE IF NOT EXISTS Users (id INT PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, ipAddr VARCHAR(16) NOT NULL);";
       // var query3 = "DROP TABLE IF EXISTS UserInfo;";
       var query4 = "CREATE TABLE IF NOT EXISTS UserInfo (id INT PRIMARY KEY AUTO_INCREMENT, name varchar(30) NOT NULL, email VARCHAR(30) NOT NULL, contact varchar(15) NOT NULL, designation varchar(20) NOT NULL, bio varchar(300));";
       // var query5 = "DROP TABLE IF EXISTS common;";
       var query6 = "CREATE TABLE IF NOT EXISTS common (id INT(64) PRIMARY KEY AUTO_INCREMENT, fromID INT NOT NULL, toID INT NOT NULL, insertTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, expireTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, flag tinyint(1) DEFAULT 0, filetag VARCHAR(100), filename VARCHAR(300), downloadlink VARCHAR(100), fileextension VARCHAR(10), comments VARCHAR(300), seen tinyint(1) NOT NULL DEFAULT 0, rank INT(8) DEFAULT 0);";
       // var query7 = "DROP TABLE IF EXISTS messages;";
       var query8 = "CREATE TABLE IF NOT EXISTS messages (id INT(64) AUTO_INCREMENT PRIMARY KEY, fromID INT NOT NULL, toID INT NOT NULL, message VARCHAR(300) NOT NULL, timeOfMsg TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, isImg tinyint(1) NOT NULL, img VARCHAR(200), imgname VARCHAR(300), seen tinyint(1) NOT NULL DEFAULT 0);";
       var query9 = "SHOW TABLES;";
       // connection.query(query1, function(err, rows, fields){
              connection.query(query2, function(err, rows, fields){
                     // connection.query(query3, function(err, rows, fields){
                            connection.query(query4, function(err, rows, fields){
                                   // connection.query(query5, function(err, rows, fields){
                                          connection.query(query6, function(err, rows, fields){
                                                 // connection.query(query7, function(err, rows, fields){
                                                        connection.query(query8, function(err, rows, fields){
                                                               connection.query(query9, function(err, rows, fields){
                                                                      for (var i=0 ;i<rows.length; i++){
                                                                             console.log((i+1)+ " -> "+JSON.stringify(rows[i]));
                                                                      }
                                                                      res.redirect('/protected');
                                                               });
                                                        });
                                                 // });
                                          });
                                   // });
                            });
                     // });
              });
       // });
});

app.post('/picchange*', function(req, res){
      var userID = req.body.userID;
       var user_name='"'+req.body.user_name+'"';
       var email='"'+req.body.email+'"';
       var contact='"'+req.body.contact+'"';
       var bio='"'+req.body.bio+'"';
        var queryToRun="update Users, UserInfo set name="+user_name+",email="+email+",contact="+contact+",bio="+bio+" where Users.id=UserInfo.id AND userID="+userID+";";
            connection.query(queryToRun, function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                 }
             });
      if(!(req.files.profilePicUpload)){
              res.redirect('/');
              return res.end();
       }
       let sampleFile = req.files.profilePicUpload;
       var mime1 = sampleFile.mimetype;
       var re = new RegExp('image/(.*)');
       var extension1 = mime1.match(re);
       var dirn = 'images/profilePics/';
       fs.readdir(dirn, (err, files) => {
              files.forEach(file => {
                     if(file.match(new RegExp('^[0-9]*')) == userID){
                            fs.unlink(dirn +''+ file, (err) => {
                                   if(err) throw err;
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
  length=13;
  var chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

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
             }
         });
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
             }
         });
        queryToRun = "SELECT * from "+ d_a_ta + " WHERE toID="+msg.fromRow.userID+" AND id="+id+";";
        connection.query(queryToRun, function(err, rows, fields){
          if(err){
            throw err;
          }else{
            var msgfile = rows[0];
            queryToRun = "SELECT * from Users WHERE userID="+msgfile.fromID+";";
            connection.query(queryToRun, function(err1, rows1, fields1){
              if(err1){
                throw err1;
              }else{
                var ip_addr = rows1[0].ipAddr;
                var t2mp = ip_addr.split(/[."]+/)
                var d_a_ta1="a"+t2mp[0]+"a"+t2mp[1]+"a"+t2mp[2]+"a"+t2mp[3];
        var queryToRun1 = "UPDATE "+d_a_ta1+" SET flag=1 where fromID="+msgfile.fromID+" AND filetag='"+msgfile.filetag+"';";
                connection.query(queryToRun1, function(err2, rows2, fields2){
                  if(err2){
                    throw err2;
                  }else{
                  }
                });
              }
            });
          }
        });
    });
    socket.on('seen',function(msg){
      io.emit('seen', msg);
    });
    socket.on('_chat', function(msg){
      if(msg.image){
        var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
        msg.dateToInsert = dateToInsert;
        var storeFilename = randomString()+'.'+extractExtension(msg.filename);
             fs.writeFileSync(__dirname + '/images/tempfiles/' + storeFilename,msg.buffer, function(err){
              if(err){
              }
             });
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
                 }
             });
            msg.storename = storeFilename;
            io.emit('_chat', msg);
      }else{
            var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
            var queryToRun = 'INSERT INTO messages (fromID, toID, message, timeOfMsg, isImg) VALUES ("'+msg.frominfo.userID+'", "'+msg.toinfo.userID+'", "'+removeQuotes(SqlString.escape(msg.message)) +'", "'+dateToInsert+'", 0);';
            connection.query(queryToRun, function(err, rows, fields){
                 if(err){ 
                     throw err;
                 }else{
                 }
             });
            io.emit('_chat', msg);
          }
    });
    socket.on('file message', function(msg){
        var dateToInsert = new Date().toISOString().slice(0, 19).replace('T', ' ');
        var date= new Date();
        msg.dateToInsert=dateToInsert;
        var year = msg.expiry.slice(0,4);
       var month = msg.expiry.slice(5,7);
       var Day = msg.expiry.slice(8,10);
       var hour = date.getHours();
       var minutes = date.getMinutes();
       var expiryDate = new Date(year, month-1, Day, hour, minutes,0);
       var expiryDateFinal = new Date(expiryDate.getTime() - 330 * 60000);
        msg.dateToInsert = dateToInsert;
        var storeFilename = randomString()+'.'+extractExtension(msg.filename);
              var dir=__dirname + '/images/common/';
              if (!fs.existsSync(dir)){
                  fs.mkdirSync(dir);
              }
             fs.writeFileSync(dir + storeFilename,msg.buffer, function(err){
              if(err){
              }
             });
             msg.downloadlink=dir + storeFilename;
            var queryToRun = "INSERT INTO common SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              insertTime: dateToInsert,
              expireTime:expiryDateFinal,
              flag:0,
              filetag:removeQuotes(SqlString.escape(msg.tag)),
              filename:removeQuotes(SqlString.escape(msg.filename)),
              downloadlink:'/images/common/' + storeFilename,
              fileextension:extractExtension(msg.filename),
              comments: removeQuotes(SqlString.escape(msg.comment)),
              rank:dict[msg.frominfo.designation]>dict[msg.toinfo.designation]?dict[msg.toinfo.designation]:dict[msg.frominfo.designation]
            };
            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                 }
             });
            var t1mp=msg.frominfo.ipAddr.split(/[."]+/);
            var d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
            var dir=__dirname + '/images/'+d_a_ta+'/';
              if (!fs.existsSync(dir)){
                  fs.mkdirSync(dir);
              }
             fs.writeFileSync(dir + storeFilename,msg.buffer, function(err){
              if(err){
              }
             });
             msg.downloadlink=dir + storeFilename;
            var queryToRun = "INSERT INTO "+d_a_ta+" SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              insertTime: dateToInsert,
              expireTime:expiryDateFinal,
              flag:0,
              filetag:removeQuotes(SqlString.escape(msg.tag)),
              filename:removeQuotes(SqlString.escape(msg.filename)),
              comments: removeQuotes(SqlString.escape(msg.comment)),
              downloadlink:'/images/'+d_a_ta+'/' + storeFilename,
              fileextension:extractExtension(msg.filename)
            };
            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                 }
             });
            t1mp=msg.toinfo.ipAddr.split(/[."]+/);
            d_a_ta="a"+t1mp[0]+"a"+t1mp[1]+"a"+t1mp[2]+"a"+t1mp[3];
            dir=__dirname + '/images/'+d_a_ta+'/';
              if (!fs.existsSync(dir)){
                  fs.mkdirSync(dir);
              }
             fs.writeFileSync(dir + storeFilename,msg.buffer, function(err){
              if(err){
              }
             });
             msg.downloadlink=dir + storeFilename;
            var queryToRun = "INSERT INTO "+d_a_ta+" SET ?";
            var values = {
              fromID: parseInt(msg.frominfo.userID),
              toID: parseInt(msg.toinfo.userID),
              insertTime: dateToInsert,
              expireTime:expiryDateFinal,
              flag:0,
              filetag:removeQuotes(SqlString.escape(msg.tag)),
              filename:removeQuotes(SqlString.escape(msg.filename)),
              comments: removeQuotes(SqlString.escape(msg.comment)),
              downloadlink:'/images/'+d_a_ta+'/' + storeFilename,
              fileextension:extractExtension(msg.filename)
            };
            connection.query(queryToRun, values,function(err, da){
                 if(err){ 
                     throw err;
                 }else{
                 }
             });
            io.emit('file message', msg);
    });
  });
  app.post('/getmsgdata', function(req, res){
    var fromRow = req.body.rowFrom;
    var toRow = req.body.rowTo;
    async.waterfall([
       function(callback){
                     if(!req.session.rowis)
                            getUserInfo(req, req.connection.remoteAddress, callback);
                      else
                        callback();
              },
        function(callback){
              if(fromRow==null && req.session.rowis != null){
                     fromRow = req.session.rowis;
              }
          if(fromRow!=null){
          var queryToRun = "UPDATE messages SET seen=1 WHERE toID='"+fromRow.userID+"';"
          connection.query(queryToRun, function(err, rows, fields){
               if(err){ 
                   throw err;
                   res.send("");
               }else{
                callback();
               }
           });
        }else{
          callback();
        }
        },
        function(callback){
          var queryToRun = 'SELECT * from messages WHERE fromID="'+req.session.rowis.userID+'" OR toID="'+req.session.rowis.userID+'";';
          connection.query(queryToRun, function(err, rows, fields){
               if(err){ 
                   throw err;
                   res.send("");
               }else{
                   res.send(JSON.stringify({rows: rows}));
                   callback(null, 'HOLA! RES22');
               }
           });
        }
      ], function(err, result){
       });
  });

app.get('/docs/:name', function(req, res){
    res.sendFile('/docs/'+req.params.name, {root: __dirname});
});
http.listen(7000,'127.0.0.1', function(){
  http.close(function(){
    http.listen(3000, myIp);
  });
});