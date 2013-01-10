var Connection = require('ssh2');
var moment = require('moment');

var now = moment();
if (process.argv.length <= 2) {
	console.log("Need a directoryname as first parameter");
	process.exit(1);
}
var directoryToScan = process.argv['2'];
var thresholdDays = parseInt(process.argv['3']) || 21;

function processHandle (sftp, handle) {
	sftp.readdir(handle, function(err, list) {
  	if (err) throw err;
    if (list === false) {
    	sftp.close(handle, function(err) {
      	if (err) throw err;
      	console.log('SFTP :: Handle closed');
      	sftp.end();
			});
			return;
		}
		processDirContents(sftp, list);
		processHandle(sftp, handle);
	});
}


function processDirContents(sftp, list) {
	list.forEach(function(item) {
		if(item.filename == '.' || item.filename == '..') return;
		var attributes = item.attrs;
		var modificationDate = moment.unix(attributes.mtime);
		var diff = now.diff(modificationDate, 'days');
		if (diff > thresholdDays) {
			process.stdout.write('Deleting "' + directoryToScan + '/' + item.filename + '" because it`s ' + diff + ' days old. (Threshold: ' + thresholdDays + ' days)\n');
			sftp.unlink(directoryToScan + '/' + item.filename, function inlinkCallback (err) {
				if(err) throw err;
			});
		}
	});
}



var c = new Connection();
c.on('connect', function() {
  console.log('Connection :: connect');
});

c.on('ready', function() {
  console.log('Connection :: ready');
  c.sftp(function(err, sftp) {
    if (err) throw err;

    sftp.on('end', function() {
      console.log('SFTP :: SFTP session closed');
			c.end();
    });

    sftp.opendir(directoryToScan, function (err, handle) {
			if(err) throw err;
			processHandle(sftp, handle);
		});

  });
});


c.on('error', function(err) {
  console.log('Connection :: error :: ' + err);
});
c.on('end', function() {
  console.log('Connection :: end');
});
c.on('close', function(had_error) {
  console.log('Connection :: close');
});



c.connect(require('./server-config.json'));
