var express = require('express');
var bodyParser = require('body-parser');
var http = require('http')
var router = express.Router();
var mysql = require('mysql');
var PythonShell = require('python-shell');
var app = express();

var mysql = require('mysql');
var conn = mysql.createConnection({
	host : 'localhost',
	user : 'root',
	password : '!@#$wowls1',
	database : 'test'
});

conn.connect();

app.locals.pretty = true;
app.set('view engine', 'ejs');
app.set('views', './views');
app.set('port', process.env.PORT || 3000);

app.use(express.bodyParser());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));

addtoheader = function (req, res, next){
  console.log("add to header called ... " + req.url);
  res.setHeader('X-XSS-Protection', 0);
  next();
}

/* GET List Page. */
app.get('/list',addtoheader, function(req, res, next) {
  var query = conn.query('select idx,title,writer,hit,DATE_FORMAT(moddate, "%Y/%m/%d %T") as moddate from board',function(err,rows){
    if(err) console.log(err)        // 만약 에러값이 존재한다면 로그에 표시합니다.
    console.log('rows :' +  rows);
    var test = '';
    res.render('board', { title:'jaejin test site',rows: rows , test: test}); // view 디렉토리에 있는 list 파일로 이동합니다.
  });
});

app.post('/list',addtoheader, function(req, res, next) {
  var query = conn.query('select idx,title,writer,hit,DATE_FORMAT(moddate, "%Y/%m/%d %T") as moddate from board',function(err,rows){
    if(err) console.log(err)        // 만약 에러값이 존재한다면 로그에 표시합니다.
    console.log('rows :' +  rows);
    var body = req.body;
    var test = body.test;
    console.log(test);
    res.render('board', { title:'jaejin test site',rows: rows, test: test }); // view 디렉토리에 있는 list 파일로 이동합니다.
  });

});

app.post('/result', function(req,res){
	var input = req.body.sentence;

	PythonShell.run('cnn_sentence_classification.py',
		{
			mode: 'text',
			pythonPath: '',
			pythonOptions: ['-u'],
			scriptPath: '/Users/jaejin/dev/Classify-positive-and-negative/RRing',
			args: [input]
		}
		, function(err, results){
		if(err) throw err;
		console.log('results: %j', results);
		res.render('classification',{
			result: results[1],
			sentence: results[0]
		})
	});
});


app.get('/list/delete/:idx', function(req, res, next){
  var idx = req.params.idx;
  console.log("idx delete : "+idx);

  conn.query('delete from board where idx like ?', [idx], function (err, rows){
    if(err) console.log(err)
  })
  res.render('delete');
})

app.get('/list/read/:idx',function (req,res,next) {
  /* GET 방식의 연결이므로 read 페이지 조회에 필요한 idx 값이 url 주소에 포함되어 전송됩니다.
   이 idx값을 참조하여 DB에서 해당하는 정보를 가지고 옵니다.
  * url에서 idx 값을 가져오기 위해 request 객체의 params 객체를 통해 idx값을 가지고 옵니다.*/
  var idx = req.params.idx;
  console.log("idx : "+idx);
  /*
  * Node는 JSP에서 JDBC의 sql문 PreparedStatement 처리에서와 같이 sql문을 작성할 때
  * ? 를 활용한 편리한 쿼리문 작성을 지원합니다.
  * Node에서 참조해야할 인자값이 있을 때 ? 로 처리하고
  * []를 통해 리스트 객체를 만든 후 ? 의 순서대로 입력해주시면 자동으로 쿼리문에 삽입됩니다.
  * 아래에는 ?에 idx값이 자동으로 매핑되어 쿼리문을 실행합니다.
  * */
  /**/
      conn.beginTransaction(function(err){
        if(err) console.log(err);
        conn.query('update board set hit=hit+1 where idx=?', [idx], function (err) {
          if(err) {
            /* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
            console.log(err);
            conn.rollback(function () {
              console.error('rollback error1');
            })
          }
          conn.query('select idx,title,content,writer,hit,DATE_FORMAT(moddate, "%Y/%m/%d %T")' +
              ' as moddate,DATE_FORMAT(regdate, "%Y/%m/%d %T") as regdate from board where idx=?',[idx],function(err,rows)
          {
            if(err) {
              /* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
              console.log(err);
              conn.rollback(function () {
                console.error('rollback error2');
              })
            }
            else {
              conn.commit(function (err) {
                if(err) console.log(err);
                console.log("row : " + rows);
                res.render('read',{title:rows[0].title , rows : rows});
              })
            }
          })
      })
  })
})

app.get('/list/write',function (req,res,next) {
  res.render('write',{title:'글 쓰기 페이지'})
})

app.post('/list/write',function (req,res,next) {
  /*
  *POST 방식의 요청을 URL에 데이터가 포함되지 않고 BODY에 포함되어 전송됩니다.
  * 때문에 request 객체를 통해 body에 접근 후 데이터를 가지고 옵니다.
   *  */
  var body = req.body;
  var writer = body.writer;
  var title = req.body.title;
  var content = req.body.content;
  var password = req.body.password;

	if (writer.charAt(0) == '<' || title.charAt(0) == '<' || content.charAt(0) == '<'){
		if (writer.charAt(0) == '<'){
			var arg = writer;
		}else if (title.charAt(0) == '<'){
			var arg = title;
		}else if (content.charAt(0) == '<'){
			var arg = content;
		}
		PythonShell.run('cnn_sentence_classification.py',
			{
				mode: 'text',
				pythonPath: '',
				pythonOptions: ['-u'],
				scriptPath: '/Users/jaejin/dev/Classify-positive-and-negative/RRing',
				args: [arg]
			}
			, function(err, results){
			if(err) throw err;
			console.log('results: %j', results);
			if (results[2] == 'javascript'){
				res.render('classification',{
					result: results[2]
				})
			}else{
				conn.beginTransaction(function(err) {
			    if(err) console.log(err);
			    // intercept ')
			    // update board set title='test123' where id > '12';

			    // insert into board(title, writer,content, password) values ('test','test','test','test');
			    conn.query('insert into board(title,writer,content,password) values(?,?,?,?)'
			        ,[title,writer,content,password]
			        ,function (err) {
			          if(err) {
			            /* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
			            console.log(err);
			            conn.rollback(function () {
			              console.error('rollback error1');
			            })
			          }
			          conn.query('SELECT LAST_INSERT_ID() as idx',function (err,rows) {
			            if(err) {
			              /* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
			              console.log(err);
			              conn.rollback(function () {
			                console.error('rollback error1');
			              })
			            }
			            else
			            {
			              conn.commit(function (err) {
			                if(err) console.log(err);
			                console.log("row : " + rows);
			                var idx = rows[0].idx;
			                res.redirect('/list');
			              })
			            }
			          })
			    })
			  })
			}

		});
	}else{
		conn.beginTransaction(function(err) {
			if(err) console.log(err);
			// intercept ')
			// update board set title='test123' where id > '12';

			// insert into board(title, writer,content, password) values ('test','test','test','test');
			conn.query('insert into board(title,writer,content,password) values(?,?,?,?)'
					,[title,writer,content,password]
					,function (err) {
						if(err) {
							/* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
							console.log(err);
							conn.rollback(function () {
								console.error('rollback error1');
							})
						}
						conn.query('SELECT LAST_INSERT_ID() as idx',function (err,rows) {
							if(err) {
								/* 이 쿼리문에서 에러가 발생했을때는 쿼리문의 수행을 취소하고 롤백합니다.*/
								console.log(err);
								conn.rollback(function () {
									console.error('rollback error1');
								})
							}
							else
							{
								conn.commit(function (err) {
									if(err) console.log(err);
									console.log("row : " + rows);
									var idx = rows[0].idx;
									res.redirect('/list');
								})
							}
						})
			})
		})
	}
})

app.get('/',function(req,res){
  res.render('view')
})

http.createServer(app).listen(app.get('port'), function(){
  console.log(' port ' + app.get('port'))
})
