var buttons     = require('sdk/ui/button/action');
var file        = require('sdk/io/file');
var timers      = require('sdk/timers');
var system      = require("sdk/system");
var crawler     = require('./crawler.js');
var fileutils   = require('./fileutils.js');
var logger      = require('./logger.js');
var abpobserver = require('./abpobserver.js');

//添加工具栏按钮
var button = buttons.ActionButton({
  id: "button1",
  label: "广告爬取和特征分析",
  icon: {
    "16": "./icon.png",
    "32": "./icon.png",
    "64": "./icon.png"
  },
  onClick: handleClick
});

function handleClick(state) {
    //读取列表文件
    var inputFile = fileutils.promptForFile();
    startCrawling(inputFile);
}

function startCrawling(urlFile, outputFile)
{
    if (!outputFile || outputFile == '')
        outputFile = file.join(file.dirname(urlFile), 'crawler.txt');
    logger.debug('input: ' + urlFile);
    logger.debug('output: ' + outputFile);
    var fileData = fileutils.readTextFile(urlFile);
    fileData = fileData.replace(/[\s\n]+$/g, ''); //去掉后面的换行和空格
    var urlList = fileData.split('\n');

    //开始爬取网页
    logger.debug('entries: ' + urlList.length);
    abpobserver.startObserver();
    crawler.startCrawling(urlList, outputFile);
}

timers.setTimeout(
    function() {
        //爬取参数指定的url文件
        var urlFile = system.staticArgs.ad_ext_start_urls;
        var outputFile = system.staticArgs.ad_ext_output_file;
        if (urlFile && urlFile != '') {
            crawler.quiteOnStop();
            startCrawling(urlFile, outputFile);
        }
    }, 3000);
