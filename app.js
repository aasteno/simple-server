var express = require('express');
var httpProxy = require('http-proxy');
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');

var DOMAIN = 'bakker.pw';

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('httpsport', process.env.HTTPS_PORT || 443);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// redirect http to https
function requireHTTPS(req, res, next) {
	if (!req.secure) {
		return res.redirect(301, 'https://' + req.get('host') + req.url);
	}
	res.header('Strict-Transport-Security', 'max-age=31536000');
	next();
}

app.use(requireHTTPS);

function stripWWW(req, res, next) {
	if (req.get('host')) {
		if (req.get('host').indexOf('www.' + DOMAIN) !== -1) {
			return res.redirect('https://' + DOMAIN + req.url);
		}
	}
	next();
}
app.use(stripWWW);

var redirects = {
	//'router':'http://127.0.0.1:8081',
	'transmission':'http://127.0.0.1:9091',
	'torrent_files':'http://127.0.0.1:9980',
	'chunk':'http://127.0.0.1:9980',
	'icons':'http://127.0.0.1:9980',
	'map':'http://127.0.0.1:9980',
	//'xbmc':'http://127.0.0.1:4444',
};

var proxy = httpProxy.createProxyServer({});

proxy.on('error', function(proxyError) {
	console.log('proxy error: ' + proxyError);
});

function proxyRedirect(req, res, next) {
	var first = req.url.split('/')[1];
	if (redirects[first]) {
		return proxy.web(req, res, {
			target : redirects[first]
		});
	}
	next();
}

app.use(proxyRedirect);


//app.use(express.favicon());
app.use(express.favicon(path.join(__dirname, 'public/images/favicon.ico')));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

// 404
app.use(require('./routes/404'));

// global jade properties
var imgSize = 24;
app.locals({
	imgSize: imgSize,
	domain: DOMAIN,
	navList: [
		{name:'Home', href:'/', img:'/images/'+imgSize+'/workspace-switcher.png'},
		{name:'Minecraft', href:'/minecraft', img:'/images/'+imgSize+'/minecraft.png'},
		{name:'Torrent', href:'/torrent', img:'/images/'+imgSize+'/transmission.png'},
		//{name:'XBMC', href:'/xbmc', img:'/images/'+imgSize+'/video-x-generic.png'},
		{name:'Mumble', href:'/mumble', img:'/images/'+imgSize+'/mumble.png'},
		//{name:'Router', href:'/router', img:'/images/'+imgSize+'/network-server.png'},
		{name:'About', href:'/about', img:'/images/'+imgSize+'/dialog-information.png'}
	]
});

app.get('/', require('./routes/index'));
app.get('/minecraft', require('./routes/minecraft'));
app.get('/torrent', require('./routes/torrent'));
app.get('/xbmc', require('./routes/xbmc'));
app.get('/mumble', require('./routes/mumble'));
app.get('/router', require('./routes/router'));
app.get('/about', require('./routes/about'));

var cipherList = [
	'ECDHE-RSA-AES128-CBC-SHA256',
	'ECDHE-RSA-AES256-CBC-SHA256',
	'ECDHE-RSA-AES128-SHA256',
	'AES128-GCM-SHA256',
	'HIGH',
	'!RC4',
	'!MD5',
	'!aNULL',
	'!EDH'
];

var credentials = {
	key: fs.readFileSync('/home/gbakker/openssl/decrypted.private.key'),
	cert: fs.readFileSync('/home/gbakker/openssl/unified.crt'),
	ciphers: cipherList.join(':'),
	honorCipherOrder: true	
};

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(app.get('port'), function(){
	console.log('Express server listening on port ' + app.get('port'));
});

httpsServer.listen(app.get('httpsport'), function(){
	console.log('Express server listening on port ' + app.get('httpsport'));
});
