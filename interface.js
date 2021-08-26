// Version 0.0.3
// State: Unstable alpha testing

var execSync = require('child_process').execSync;
var util = require('util');
var mysql = require("mysql");
var blessed = require('blessed');

var dbcon = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "pass",
  timeout: 999999,
  database: "db"
});

var screen = blessed.screen({
  smartCSR: true,
  autoPadding: true,
  dockBorders: true,
});

screen.title = 'Control Panel';

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

async function exec(cmd) { // Execute a command and return the output
  return execSync(`${cmd}`, {
    encoding: 'utf-8'
  });
}

var full = blessed.box({
  top: '0.1%',
  left: '0.1%',
  width: '99.9%',
  height: '99.9%',
  tags: true,
  /*border: {
    type: 'line'
  },*/
  style: {
    fg: 'white',
    bg: 'full',
    border: {
      fg: '#f0f0f0'
    },
    /*hover: {
      bg: 'green'
    }*/
  }
});

var stats = blessed.box({
  parent: full,
  //position: 'relative',
  top: '1%',
  left: '85%',
  width: '15%',
  height: '19%',
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'transparent',
    border: {
      fg: '#f0f0f0'
    }
  }
});
var out = blessed.box({
  parent: full,
  //position: 'relative',
  top: '21%',
  left: '0%',
  width: '85%',
  height: '79%',
  content: "",
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'transparent',
    border: {
      fg: '#f0f0f0'
    }
  }
});
var systemUsage = blessed.box({
  parent: full,
  //position: 'relative',
  top: '1%',
  left: '0%',
  width: '85%',
  height: '19%',
  content: "",
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'transparent',
    border: {
      fg: '#f0f0f0'
    }
  }
});
var menu = blessed.box({
  parent: full,
  //position: 'relative',
  top: '21%',
  left: '85%',
  width: '15%',
  height: '79%',
  content: `{bold}Menu{/bold}`,
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'transparent',
    border: {
      fg: '#f0f0f0'
    }
  }
});

var time = "";
var dbUsers = "";
var dbEntries = "";
var connections = "";
var page = 0;
var selecting = 0;
var isNewSec = false;
var isNewMin = false;
var minCalc = 0;
var rightNow = "";
var out = "";

var a0 = ["Users", "Settings"];// Main Menu
var a1 = ["Temp", "Temp"]; // User Menu
var a2 = ["Code Refresh Rate: {x}", "Screen Refresh Rate: {x}"];// Settings Menu

var menusArray = ["a0", "a1", "a2"];

async function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

screen.key(['enter', 'backspace', 'up', 'down', 'left', 'right'], function(ch, key) {
  return new Promise((resolve, reject) => {
    switch (key.name) {
      case 'enter': {
        page = selecting;
        break;
      }
      case 'backspace': {
        page--;
        break;
      }
      case 'up': {
        selecting--;
        break;
      }
      case 'down': {
        selecting++;
        break;
      }
      case 'left': {

        break;
      }
      case 'right': {

        break;
      }
    }
    menuGen();
    resolve(1)
  })
});

async function menuGen() {
  var workingArray = eval("a" + page);
  console.log(page, selecting, menusArray.length)
  var finished = "";

  var length = workingArray.length - 1;

  workingArray.forEach((x, index) => {
    if (selecting.toString() == index.toString()) {
      finished = finished + "\n{left}>> " + x + "{/left}";
    } else {
      finished = finished + "\n{left}   " + x + "{/left}";
    }
  })
  menu.setContent(`{bold}${finished}\n\n\n${selecting}:${workingArray.length - 1}{/bold}`);
}

async function databaseCount(bypass) {
  if (isNewMin || bypass) { // Running once per minute
    dbcon.query(`SELECT COUNT(distinct(user)) as "distinct" FROM users`, (err, rows) => {
      if (err) throw err;
      rows.forEach((row) => {
        dbUsers = row.distinct;
      });
    });
    dbcon.query(`SELECT COUNT(user) as "full" FROM users`, (err, rows) => {
      if (err) throw err;
      rows.forEach((row) => {
        dbEntries = row.full;
      });
    });
  }
}

async function getConnections(bypass) {
  if (isNewMin || bypass) { // Running once per minute
    execSync(`screen -dm bash -c "timeout 10 bash /root/bot/scripts/connections.sh 2>/dev/null | grep "\\:" > /root/bot/scripts/temp.txt; bash /root/bot/scripts/clean.sh"`);
  }
  var temp = execSync(`cat /root/bot/scripts/temp.txt | grep "Connections:" | sed 's/Total Connections:  //g'`, {
    encoding: 'utf-8'
  }); // the default is 'buffer'
  if (!parseInt(temp)) {
    connections = "Updating..."
  } else {
    connections = temp;
  }
}

async function clock() {
  // Most visual elements don't need to be refreshed as frequently as the output refreshes, so we just make them update on set intervals.
  // This function keeps track of those
  var now = `${execSync('date')}`;
  if (!rightNow.includes(now)) {
    isNewSec = true;
    stats.setContent(`{center}{bold}${execSync('date +"%T %a %b %Y"')}{/center}\n{left}Connections: ${connections.replace(/(\r\n|\n|\r)/gm," ")}\nDatabase Users: ${dbUsers}\nDatabase Entries: ${dbEntries}{/bold}{/left}`);
  } else {
    isNewSec = false;
  }
  if (isNewSec) {
    if (minCalc >= 59) {
      isNewMin = true;
      minCalc = 0;
    } else {
      isNewMin = false;
      minCalc++;
    }
  }
  rightNow = now;
  return isNewSec;
}

async function sysUseUpdater() {
  if (!isNewSec) return;
  // HTOP is an gui only program which means having it scripted is extremely difficult, here we run it for a split second and do some output filtering
  // Although this works the CPU usage dosent display properly most likely because the initial value isnt the true and all updates to the gui application are done by cursor movements and writes which we cannot properly catch and work with.
  // Most likely I would just compile a modified source to print the true values initially.
  systemUsage.setContent(`${execSync('echo q | htop | aha --line-fix | html2text -width 999 |  grep -v "F1Help\\|xml version=" | head -8 | tail -6')}`);
}

async function outUpdater() {
  var now = `${execSync(`cat /root/bot/terminal/log.txt | tail -${out.height - 5}`)}`;
  if (!out.includes(now)) {
      out.setContent(`${now}`);
      out = now;
  }
}

async function launchOutSource() {
  // Using the functionality of "screen" and some tinkering we can start the main process inside its own screen running seperatly from this process
  execSync("rm -rf /root/bot/terminal/log.txt; screen -X -S out kill; screen -dmS out; screen -S out -p 0 -X stuff 'exec $SHELL\n'; screen -S out -p 0 -X stuff 'script -f /root/bot/terminal/log.txt\n'");
  execSync("screen -S out -p 0 -X stuff 'cd /root/bot; ./start.sh^M'");
  return 1;
}

async function main() {
  time = `${execSync('date')}`;
  //launchOutSource();
  menuGen();
  getConnections(1);
  databaseCount(1);
  screen.append(full);
  full.focus();
  screen.render();
  while (1) {
    await sleep("1")
    clock();
    databaseCount();
    getConnections();
    sysUseUpdater();
    outUpdater();
    screen.render();
  }
}
main();
