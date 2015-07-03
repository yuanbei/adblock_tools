var utils       = require('./utils.js');
var blockdata   = require('./blockdata.js');
var logger      = require('./logger.js');

var Extractor = {
    extract : function(wnd, blockList)
    {
        this.enableDebug = false;
        this.wnd = wnd;
        this.blockList = blockList;
        this.treeStates = [];
        this.logger = logger.create();
        this.extractNode(wnd.document.documentElement);
    },

    treeState : function()
    {
        var treeStates = this.treeStates;
        if (treeStates.length == 0)
            treeStates.push({});
        return treeStates[treeStates.length - 1];
    },

    getElemUrl : function(elem)
    {
        return elem.src;
    },

    isAdName : function(value)
    {
        if (!value)
            return false;
        if (!value.toLowerCase)
            return false;
        var value = value.toLowerCase();
        if (value.indexOf('ad') != -1) {
            //排除一些常见单词
            var excludes = ['adapt', 'add', 'bad', 'bread', 'broad', 'grade', 'head', 'load', 'pad', 'read', 'shadow']; 
            for each (ex in excludes) {
                if (value.indexOf(ex) != -1)
                    return false;
            }
            return true;
        }
        return false;
    },
    
    updateTreeState : function(elem)
    {
        if (!elem.style)
            return;
        if (elem.style.position == 'absolute' || elem.style.position == 'fixed')
            this.treeState().absPos = true;
        if (this.isAdName(elem.id) || this.isAdName(elem.className)) {
            this.treeState().idContainsAd = true;
        }
    },

    //获取元素数据（主要是用来保存features）
    getElemData : function(elem)
    {
        //在adblock过滤列表里
        var elemUrl = this.getElemUrl(elem);
        if (!elemUrl || !elemUrl.match(/^https?:/))
            return;
        var result = this.blockList[elem.tagName][elemUrl];
        if (!result)
            result = blockdata.getElemData(this.wnd, 0, elem.tagName, elemUrl, true);
        return result;
    },

    getElemSize : function(elem)
    {
        //width/height
        var w = elem.width, h = elem.height;
        //naturalWidth/naturalHeight
        if (w == 0 || h == 0) {
            w = elem.naturalWidth;
            h = elem.naturalHeight;
        }
        //clientWidth/clientHeight
        if (w == 0 || h == 0) {
            w = elem.clientWidth;
            h = elem.clientHeight;
        }
        //获取css定义的尺寸
        if (w == 0 || h == 0) {
            var style = this.wnd.getComputedStyle(elem);
            if (style && style.width && style.height) {
                var styleWidth = style.width;
                var styleHeight = style.height;
                if (styleWidth.match(/\d+px/) && styleHeight.match(/\d+px/)) {
                    w = styleWidth.substr(0, styleWidth.length - 2);
                    h = styleHeight.substr(0, styleHeight.length - 2);
                }
            }
        }
        return {w:w, h:h};
    },

    extractPosition : function(elem, features)
    {
        if (this.treeState().absPos)
            features['absPos'] = true;
    },
    
    //宽高比
    extractWHRatio : function(elem, features)
    {
        var size = this.getElemSize(elem);
        var w = size.w;
        var h = size.h;
        if (!w || !h)
            return;
        var ratio = 0;
        if (w > 0 && h > 0)
            ratio = w / h;
        features['whRatio'] = ratio.toFixed(1);
    },

    extractArea : function(elem, features)
    {
        if (elem.tagName != 'IMG' && elem.tagName != 'IFRAME')
            return;
        var size = this.getElemSize(elem);
        var w = size.w;
        var h = size.h;
        if (!w) w = 0;
        if (!h) h = 0;
        features['area'] = w * h;
    },

    //id或class
    extractId : function(elem, features)
    {
        if (this.treeState().idContainsAd)
            features['idContainsAd'] = true;
    },

    printNode : function(elem)
    {
        if (elem.nodeType == elem.ELEMENT_NODE) {
            var msg = '<' + elem.tagName;
            if (elem.id)
                msg += ' id=' + elem.id;
            if (elem.className)
                msg += ' class=' + elem.className;
            if (elem.tagName == 'IFRAME')
                msg += ' src=' + elem.getAttribute('src');
            if (this.treeState().idContainsAd)
                msg += ' [idContainsAd]';
            if (this.treeState().absPos)
                msg += ' [absPos]';
            msg += '>';
            this.logger.debug(msg);
        }
    },
    
    extractNode : function(elem)
    {
        if (!elem) return;
        if (this.logger.depth > 100)
            return;
    
        //调试信息
        if (this.enableDebug) {
            this.printNode(elem);
        }
 
        //更新子树状态
        this.treeStates.push(utils.cloneObject(this.treeState()));
        this.updateTreeState(elem);
   
        if (elem.tagName in this.blockList) {
            //提取特征
            var elemData = this.getElemData(elem);
            if (elemData) {
                this.extractPosition(elem, elemData.features);
                this.extractWHRatio(elem, elemData.features);
                this.extractId(elem, elemData.features);
                this.extractArea(elem, elemData.features);
            }
        }

        //处理孩子节点
        this.logger.incDepth();
        var child = elem.firstChild;
        while (child) {
            this.extractNode(child);
            child = child.nextSibling;
            if (child == elem.firstChild)
                break; //避免环
        }
        this.logger.decDepth();

        this.treeStates.pop();

    },
    
};

function extract(wnd, blockList, noAdList)
{
    var extractor = Object.create(Extractor);
    extractor.extract(wnd, blockList, noAdList);
}

exports.extract = extract;
