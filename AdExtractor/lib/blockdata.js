(function(){
    var gData = [];

    function getWndData(wnd)
    {
        for (var i = 0; i < gData.length; i ++) {
            if (gData[i].wnd == wnd.top)
                return gData[i].data;
        }
        var data = [
            new Object(), //0: unblocked
            new Object(), //1: blocked
        ];
        gData.push({wnd:wnd.top, data: data, startTime: Date.now()});
        return gData[gData.length - 1].data;
    }

    function initWndData(wnd)
    {
        getWndData(wnd);
    }

    function getBlockData(wnd, block)
    {
        return getWndData(wnd)[block];
    }

    function getTypeData(wnd, block, type)
    {
        var blockData = getBlockData(wnd, block);
        if (blockData[type] === undefined)
            blockData[type] = new Object();
        return blockData[type];
    }

    function getElemData(wnd, block, type, url, autoInit)
    {
        var typeData = getTypeData(wnd, block, type);
        if (typeData[url] === undefined && autoInit) {
            typeData[url] = {
                features: {}
            };
        }
        return typeData[url];
    }

    function initElemData(wnd, block, type, url)
    {
        getElemData(wnd, block, type, url, true);
    }

    function forEachWnd(handler) {
        var i = 0;
        while (i < gData.length) {
            var wndData = gData[i];
            if (handler(wndData.wnd, wndData.data, wndData.startTime) === true) {
                gData[i] = gData[gData.length - 1];
                gData.pop();
            }
            else
                i ++;
        }
    }

    //导出函数
    exports.initWndData = initWndData;
    exports.initElemData = initElemData;
    exports.getElemData = getElemData;
    exports.forEachWnd = forEachWnd;
    exports.getWndCount = function() { return gData.length; }
})();
