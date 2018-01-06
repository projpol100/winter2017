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

var favicon = require('serve-favicon');
var logger = require('morgan');
var ip = require('ip');
var schedule = require('node-schedule');
var path = require('path');

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

var myIp = "127.0.0.1";

app.set('views',path.join(__dirname,'views'));
app.engine('html', require('ejs').renderFile);

app.set('view engine', 'ejs');
// app.use(logger('dev'));
app.use(fileUpload({preserveExtension: 3}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
// app.use(upload.array());
app.use(cookieParser());
app.use(session({secret: "hamunaptra", resave: false, saveUninitialized: true}));
app.use(express.static(path.join(__dirname, 'public')));
var mysql = require('mysql');
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'satya',
    database: 'polproj100',
    charset: 'utf8mb4'
});
var admin = {username: "sss2017", password: "PolProj@2017"};
var i=0;
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
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}
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

    if(req.session.user.username==admin.username && req.session.user.password == admin.password){
        next();
    }else{
        res.render('admin.html', {message: "Login First"});
    }
}

app.get('/protected', checkAdmin, function(req, res){
    var prev_query = "CREATE TABLE IF NOT EXISTS Users (ID INT PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, ipAddr VARCHAR(16) NOT NULL);";
    connection.query(prev_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
                 console.log("HO GYA KYA?");
           }
       });
    var next_query = "CREATE TABLE IF NOT EXISTS UserInfo (ID INT PRIMARY KEY AUTO_INCREMENT, name varchar(30) NOT NULL, email VARCHAR(30) NOT NULL, contact varchar(11) NOT NULL, designation varchar(20) NOT NULL);";
    connection.query(next_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
               //console.log(tablename);
                 console.log("HO GYA KYA?");
           }
       });
    connection.query("SELECT * FROM Users, UserInfo WHERE Users.id=UserInfo.id;", function(err, rows, fields){
       if(err){
              throw err;
       }else{
              res.render('protected.html', {users: rows});
       }
    });
});

app.post('/logout', function(req, res){
        req.session.destroy(function(){
            console.log("Out!");
            res.redirect('/admin');
        });
});

app.post ('/removeuser', checkAdmin, function(req, res){
  var id = req.body.I;
  var userid = req.body.ID;
  console.log(id +"   " +userid);
  connection.query("DELETE FROM Users WHERE id='"+id+"';", function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From Users");
        }
 });
  connection.query("DELETE FROM UserInfo WHERE id='"+id+"';", function(err, rows, fields){
        if(err){
               throw err;
        }else{
               console.log("Removed From UserInfo");
        }
 });
  
var removemsgquery = "DELETE FROM messages WHERE fromID='"+userid+"' OR toID='"+userid+"';";
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
       connection.query("CREATE TABLE if not exists "+d_a_ta+" (id INT AUTO_INCREMENT PRIMARY KEY,fromID INT NOT NULL,toID INT NOT NULL,insertTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,expireTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,flag int default 0,filetag VARCHAR(100),filename VARCHAR(1000),downloadlink VARCHAR(100),fileextension VARCHAR(10), comments VARCHAR(300), seen tinyint(1) NOT NULL DEFAULT 0 );", function(err, rows, fields){
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

app.get('/events',function(req,res){
  
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  var ipadd = '"' + req.connection.remoteAddress + '"';
  console.log(tablename+"-->"+ipadd);
  connection.query("SELECT * from Users where ipAddr="+ipadd+";", function(err,rows,fields){
    console.log(rows[0]);
    var userID = rows[0].userID;
  });
  var prev_query = "CREATE TABLE IF NOT EXISTS "+ tablename+" (ID INT PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, NAME VARCHAR(50) NOT NULL , DATE VARCHAR(20) NOT NULL, MESSAGE VARCHAR(255));";
  connection.query(prev_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
               console.log(tablename);
                 console.log("HO GYA KYA?");
           }
       });
  connection.query("SELECT * FROM " + tablename + ";", function(err, rows, fields){
       if(err){
              throw err;
       }else{
              res.render('events.html', {users: rows, dates: {start: new Date().toISOString().slice(0, 19).replace('T', ' '), end: (new Date((new Date()).setDate((new Date()).getDate() + parseInt(7)))).toISOString().slice(0, 19).replace('T', ' ')}});
       }
    });
});

var process = function(allips, x){
  if(x<allips.length){
    var tzoffset = (new Date()).getTimezoneOffset() * 60000
    var tablename = "e"+((allips[x].replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
    
    var curr_date = new Date(Date.now()-tzoffset).toISOString().slice(0, 19).replace('T', ' ');
    var prev_query = "CREATE TABLE IF NOT EXISTS "+ tablename+" (ID INT PRIMARY KEY AUTO_INCREMENT, userID INT NOT NULL, NAME VARCHAR(50) NOT NULL , DATE VARCHAR(20) NOT NULL, MESSAGE VARCHAR(255));";
    connection.query(prev_query, function(err, rows, fields){
             if(err){ 
                 throw err;
             }else{
                 //console.log(tablename);
                   //console.log("HO GYA KYA?");
             }
         });
    connection.query("select * from "+ tablename +" WHERE DATE >= NOW() order by DATE ASC;", function(err,rows,fields){
      if(err){
        throw err;
      }else{
        for(var i = 0; i < rows.length; i++){
          console.log(curr_date + "--->>>" + rows[i].DATE + " -->> "+rows[i].userID + " -->  "+tablename + " --> ");
          //console.log(rows.length);
          if(rows[i].DATE === curr_date){
            console.log("YE CHOR MACHAE SHOR");
            io.emit('message intranet', {info: rows[i], ip: allips[x]});
            //console.log(rows.length);
            //alert("ye kya ho gya");
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
    console.log(">>>>>> DONE  "+result);
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
                     var rank=dict[req.session.rowis.designation];
                    var queryToRun = 'SELECT * from common WHERE rank > '+rank+' or rank = '+rank+' ';
                    // console.log(">>  "+queryToRun);
                    var row = req.session.rowis;
                    connection.query(queryToRun, function(err, rows, fields){
                         if(err){ 
                             throw err;
                         }else{
                            // console.log(JSON.stringify(rows));
                             // res.send(JSON.stringify({rows: rows}));
                             var dirn = 'images/profilePics/';
                            fs.readdir(dirn, (err, files) => {
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
    console.log(year + " " + month + " " + Day);
    //var cont = req.cont;
    var currr_date=new Date(year,month-1,Day,00,00,0);
    var curr_date = new Date(currr_date.getTime()-(currr_date.getTimezoneOffset()*60000)).toISOString().slice(0, 19).replace('T', '  ');
    //var curr_date = new Date(year,month-1,Day,00,00,00).toISOString().slice(0, 10).replace('T', ' ');
    console.log(curr_date);
    console.log("select * from "+ tablename +" WHERE DATE(DATE) = '"+curr_date+"' order by DATE ASC;");
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
    console.log(req.body.DATE);
    console.log(typeof(req.body.DATE));
    console.log(req.body.TIME);
    console.log(typeof(req.body.TIME));
    var year = req.body.DATE.slice(0,4);
    var month = req.body.DATE.slice(5,7);
    var Day = req.body.DATE.slice(8,10);
    var hour = req.body.TIME.slice(0,2);
    var minute = req.body.TIME.slice(3,5);
    console.log(year + " " + month + " " + Day + " " + hour + " " + minute);
    //var cont = req.cont;
    var currr_date=new Date(year,month-1,Day,hour,minute,0);
    var curr_date = new Date(currr_date.getTime()-(currr_date.getTimezoneOffset()*60000)).toISOString().slice(0, 19).replace('T', ' ');
    //currr_date.setMinutes(currr_date.getMinutes()+currr_date.getTimezoneOffset());
    //console.log(currr_date);
    console.log(curr_date);
  connection.query("SELECT * from Users where ipAddr="+ipadd+";", function(err,rows,fields){
      console.log("Ye chalta hai");
      console.log(JSON.stringify(rows));
    var iduser = rows[0].userID;
    console.log(rows[0].userID);
      var prev_query = "CREATE TABLE IF NOT EXISTS " + tablename + "(ID INT PRIMARY KEY AUTO_INCREMENT,userID INT NOT NULL, NAME VARCHAR(50) NOT NULL , DATE VARCHAR(20) NOT NULL, MESSAGE VARCHAR(255) NOT NULL);";
  connection.query(prev_query, function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
               console.log(tablename);
                 console.log("HO GYA"); console.log(iduser);
           }
       });
  connection.query("INSERT INTO "+ tablename +" (userID, NAME , DATE, MESSAGE) VALUES ('"+iduser+"', '"+mysql_real_escape_string(curr_name)+"', '"+curr_date+"', '"+mysql_real_escape_string(curr_message)+"');", function(err, rows, fields){
              if(err){
                     throw err;
              }else{
                  console.log(curr_date);
                  console.log(req.body.DATE);
                   console.log(tablename);
                     console.log("ADDED EVENT");
              }
       });

  });
    // var curr_event = new UserEvents({
    //  message : curr_message,
    //  date : curr_date,
    //  IP : req.connection.remoteAddress;
    // });
    res.redirect('/events');
});

app.post('/deleteEvent',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  var ipadd = '"' + req.connection.remoteAddress + '"';
  var i = req.body.I;
  connection.query("SELECT * from Users where ipAddr="+ipadd+";", function(err,rows,fields){
    var userID = rows[0].userID;
  });
  //var cont = req.cont;
  connection.query("DELETE from "+ tablename +" WHERE ID=" + i + ";", function(err, rows, fields){
           if(err){ 
               throw err;
           }else{
                 console.log("YE BHI HO GYA");
           }
       });
  res.redirect('/events');
});

app.post('/today',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  console.log(i+"-->");
  i=0;
  console.log(i);
  var prev_query = "Select * from "+tablename+"  WHERE DATE >= CURDATE()-INTERVAL 1 DAY AND DATE <= CURDATE()+INTERVAL 1 DAY;";
  connection.query(prev_query, function(err,rows,fields){
    if(err){
      throw(err);
    }else{
      console.log(prev_query);
      res.render('events.html',{users:rows, dates: {start: new Date().toISOString().slice(0, 19).replace('T', ' '), end: (new Date((new Date()).setDate((new Date()).getDate() + parseInt(7)))).toISOString().slice(0, 19).replace('T', ' ')}});
    }
  });
});

app.post('/goleft',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  console.log(i+"-->");
  i=i-1;
  console.log(i);
  var l= -i*7-1; var r=(i+1)*7;
  console.log("LLLLL -->> "+l+"  RRRR--> "+r);

  var prev_query = "Select * from "+tablename+" WHERE DATE >= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())+"+l+" DAY AND date <= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())-"+r+" DAY;";
  connection.query(prev_query, function(err,rows,fields){
    if(err){
      throw(err);
    }else{
      console.log(prev_query);
      res.render('events.html',{users:rows, dates: {start: (new Date((new Date()).setDate((new Date()).getDate() - parseInt(l)))).toISOString().slice(0, 19).replace('T', ' '), end:  (new Date((new Date()).setDate((new Date()).getDate() + parseInt(r)))).toISOString().slice(0, 19).replace('T', ' ')}});
    }
  });
});

app.post('/goright',function(req,res){
  var tablename = "e"+((req.connection.remoteAddress.replace('.', 'e')).replace('.', 'e')).replace('.', 'e');
  console.log(i+"-->");
  i=i+1;
  console.log(i);
  var l=1+i*7; var r=(i+1)*7;
  console.log("22LLLLL -->> "+l+"  RRRR--> "+r);
  var prev_query = "Select * from "+tablename+" WHERE DATE >= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())-"+l+" DAY AND date <= CURDATE() - INTERVAL DAYOFWEEK(CURDATE())-"+r+" DAY;";
  connection.query(prev_query, function(err,rows,fields){
    if(err){
      throw(err);
    }else{
      console.log(prev_query);
      res.render('events.html',{users:rows, dates: {start: (new Date((new Date()).setDate((new Date()).getDate() + parseInt(l)))).toISOString().slice(0, 19).replace('T', ' '), end:  (new Date((new Date()).setDate((new Date()).getDate() + parseInt(r)))).toISOString().slice(0, 19).replace('T', ' ')}});
    }
  });
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
                    console.log("VOILA!!!");
                  }
                });
              }
            });
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