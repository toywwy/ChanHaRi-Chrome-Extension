/**
 * Copyright 2011 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author opensource@google.com
 * @license Apache License, Version 2.0.
 */
// Constants.
var MOVE_COOLDOWN_PERIOD_MS = 400;
var X_KEYCODE = 88;
var counter = 1;

// Global variables.
var queryEl = [];	//xPath element 관리 리스트
var resultsEl = []; //tag의 value element 관리 리스트
var nodeCountEl = document.getElementById('node-count');
var nodeCountText = document.createTextNode('0');
var lastMoveTimeInMs = 0;
///////////////

//TODO Task 로직에 대해서
var taskId = 0; //현재 진행하고 있는 TaskId
var tasks = [];
const taskKey = "TASK";

//TODO Task 페이지 관리


$(function () {
    $('a.taskSelectFunction').bind('click', function () {

        if(taskId !=this.id) {
            taskId = this.id;

            // alert("selected id : " + taskId);

            //TODO 새로 지우고 다시 update를 해야한다.
            while (counter>1) {

                queryEl[counter - 1].removeEventListener('keyup', evaluateQuery);
                queryEl[counter - 1].removeEventListener('mouseup', evaluateQuery);

                queryEl.pop();
                resultsEl.pop();

                $("div#form" + (counter)).remove();
                $("br:last").remove();
                counter--;
            }
            //counter가 0이되면서 모든게 지워지고 


            //TODO 새로 그리기 //바뀌어진 아이디로 그리면된다.

            if(!loadStorage())//비여있다면 하나 넣어줘야한다.
            {
                $('input#x_path1').val('');
                $('input#input_text1').val('');

                $('select#select_command1').val('Select commands').change();
                $("button.select_logic"+counter).remove();//무조건 다 지운다. 빈거이기 때문
                $('select#select_extention1').val('Select Extention').change();//지우지못했어 css만 지웠음..
                $('div#div_select1').hide();

            }

        }
    });
});


// TODO Seongha
// 일단 화면이 로드되기 전에 있는지 확인을 하는 부분!
/**
 * 처음엔 아마도 HTML을 먼저 그린다고했었던거같은데???
 * MakeJson에서 .... 여기에서 Backup을 하는 부분도 추가를 하는 것이다.
 */

$(window).load(function () {
    //익스텐션이 꺼질때도 발생한다.
    loadStorage();
});

function saveStorage(key, data) {
    var obj = {};
    obj[key] = data;
    // alert("save : "+obj[key][0].xPath);

    chrome.storage.sync.set(obj, function () {
        console.log("key = "+key+' , data = '+data+ " is suc !");
    });
}

function loadStorage() {
    chrome.storage.sync.get((taskKey + taskId), function (item) {
        if (item[(taskKey + taskId)] === undefined) {
            //alert("Not exist saved Data");
            console.log("Not exist saved Data");
            return false;
        } else {
            tasks[taskId] = item[(taskKey + taskId)];
            loadInputData();
            return true;
        }
    });
}

function loadInputData() {
    var task = tasks[taskId];
    for (var i = 1; i <= task.length; i++) {
        $(function () {
            $('input#x_path' + i).val(task[i - 1].xPath)
        });
        $(function () {
            $('input#input_text' + i).val(task[i - 1].inputText)
        });
        $(function () {
            $('select#select_command' + i).val(task[i - 1].selectCommand).change()
        });

        if (task[i - 1].selectExtention != undefined) {
            $(function () {
                $('select#select_extention' + i).val(task[i - 1].selectExtention).change()
            });
        }
        if (i < task.length)
            $("button#append").click();
    }
}


$(function () {
    $('button#clear').bind('click', function () {
        //TODO claer 전체하는 게아니라 ID를 가지고 부분만 delete를 하도록 수정해야함.
        // chrome.storage.sync.clear(function () {
        //     alert("Chrome Storage CLEAR");
        // });

        chrome.storage.sync.remove((taskKey+taskId),function()
        {
            alert("Chrome Storage remove : "+(taskKey+taskId));
        });

        location.reload();
    });
});


queryEl.push($("div#form" + counter + ".defaultaction" + ",input.name")[1]);
resultsEl.push($("label.information")[0])
nodeCountEl.appendChild(nodeCountText);

// Used by handleMouseMove() to enforce a cooldown period on move.

var evaluateQuery = function () {	//마우스로 영역 선택시 리퀘스트 보냄
    chrome.runtime.sendMessage({
        type: 'evaluate',
        query: queryEl[counter - 1].value
    });
};

var handleRequest = function(request, sender, cb) {
    if (request.type === 'update') {
        if (request.query !== null) {
            queryEl[counter-1].value = request.query;
        }
        if (request.results !== null) {
            if(request.results[0].length >300)
                resultsEl[counter-1].innerHTML = request.results[0].slice(0,300);
            else
                resultsEl[counter-1].innerHTML = request.results[0];
            nodeCountText.nodeValue = request.results[1];
        }
    }
};

var handleMouseMove = function (e) {
    if (e.shiftKey) {
        // Only move bar if we aren't in the cooldown period. Note, the cooldown
        // duration should take CSS transition time into consideration.
        var timeInMs = new Date().getTime();
        if (timeInMs - lastMoveTimeInMs < MOVE_COOLDOWN_PERIOD_MS) {
            return;
        }
        lastMoveTimeInMs = timeInMs;
        // Tell content script to move iframe to a different part of the screen.
        chrome.runtime.sendMessage({type: 'moveBar'});
    }
};

var handleKeyDown = function (e) {
    var ctrlKey = e.ctrlKey || e.metaKey;
    var shiftKey = e.shiftKey;
    if (e.keyCode === X_KEYCODE && ctrlKey && shiftKey) {
        chrome.runtime.sendMessage({type: 'hideBar'});
    }
};

queryEl[counter - 1].addEventListener('keyup', evaluateQuery);
queryEl[counter - 1].addEventListener('mouseup', evaluateQuery);

// Add mousemove listener so we can detect Shift + mousemove inside iframe.
document.addEventListener('mousemove', handleMouseMove);
// Add keydown listener so we can detect Ctrl-Shift-X and tell the content
// script to hide iframe and steal focus.
document.addEventListener('keydown', handleKeyDown);

chrome.runtime.onMessage.addListener(handleRequest);


function saveActionData() {
    // 객체 save 로직
    var obj = {};

    obj.xPath = $('input#x_path' + (counter - 1)).val();
    obj.inputText = $('input#input_text' + (counter - 1)).val();
    obj.selectCommand = $('select#select_command' + (counter - 1)).val();

    if (obj.selectCommand == 'CRAWLING')//CRAWLING 선택될 경우
        obj.selectExtention = $('select#select_extention' + (counter - 1)).val();

    try {
        tasks[taskId][counter - 2] = obj;
    }
    catch (err) {
        //초기화 안된경우에 처리해줘야한다.
        tasks[taskId] = [];
        tasks[taskId][counter - 2] = obj;
    }

    saveStorage((taskKey + taskId), tasks[taskId]);
}

var addQuery = function () {

    saveActionData();//save 로직

    queryEl.push($("input.name:last")[0]);
    resultsEl.push($("label.information:last")[0])

    for (var num = 0; num < queryEl.length; num++) {
        console.log(queryEl[num]);
        console.log(resultsEl[num]);
    }

    //이벤트 리스너 추가 하는거다.
    queryEl[counter - 1].addEventListener('keyup', evaluateQuery);
    queryEl[counter - 1].addEventListener('mouseup', evaluateQuery);
}

var deleteQuery = function () {	//chanhee
    queryEl[counter - 1].removeEventListener('keyup', evaluateQuery);
    queryEl[counter - 1].removeEventListener('mouseup', evaluateQuery);

    queryEl.pop();
    resultsEl.pop();
    tasks[taskId].pop();

    saveStorage((taskKey + taskId), tasks[taskId]);

    for (var num = 0; num < queryEl.length; num++) {
        console.log(queryEl[num]);
        console.log(resultsEl[num]);
    }
}

//TODO Seongha save Chrome Storage에 저장을 한다.
$(function () {
    $('button#save').bind('click', function () {
        //TODO save 버튼을 누를시에도 저장을한다. taskId 에 따라서 저장을 하면된다.
        counter+=1;
        saveActionData();
        counter-=1;
    });
});


$(function () {
    $('button#run').bind('click', function () {
        //TODO last action data Save
        counter += 1;//
        var command = $('select#select_command' + (counter - 1)).val();
        if ("Select commands" == command) {
            //아무것도 입력안하고 전송함을 방지 한다.
            counter -= 1;
            alert('Select Commands !')
            return;
        }

        saveActionData();
        counter -= 1;//

        var actions = [];
        var temp = tasks[taskId];

        console.log(temp);
        console.log(counter);

        //TODO counter는 Task별로 관리를 할 필요 가 없는 것 인가??
        for (var i = 0; i < counter; i++) //무조건 Counter 갯수 만큼
        {
            var obj = {};
            obj.xpath = temp[i].xPath;
            obj.command = temp[i].selectCommand;
            obj.contents = [];

            if (obj.command == "CRAWLING") {
                obj.contents.push(temp[i].selectExtention);
                obj.contents.push(temp[i].inputText);
            }
            else {
                obj.contents.push(temp[i].inputText);
            }
            console.log("proc  : " + i);
            actions.push(obj);
        }
        console.log(actions);
        alert("Run macro id <" + (taskId) + ">");

        var sendData ={};
        sendData.taskId = taskId; //TaskId 추가
        sendData.actions = actions; //Task에 해당하는 actions 배열 전달.

        $.ajax({
            type: "POST",
            url: "http://localhost:5000/_analysis_json",
            cache: false,
            timeout: 30000,
            contentType: "application/json; charset=UTF-8",
            dataType: "json",
            data: JSON.stringify(sendData),
            success: function (data) {
                //TODO 0905수정
                //Data = { resultCdoe : 0 , taskId : 0 } //둘다 Number
                if(data["resultCode"] == 1) {
                    alert('Task['+data["taskId"]+'] Macro Success');
                }else {
                    alert('Task['+data["taskId"]+'] Macro Failure');
                }

            },
            fail : function ()
            {
                alert('Network Error')
            }
        });
    });
});


(function ($, undefined) {

    $(document).bind("pagecreate", function (e) {
        $(document).on("click", "#delete", function (e) {
            console.log("delete-clicked")
            if (counter > 1) {
                //UI Delete
                $("div#form" + (counter)).remove();
                $("br:last").remove();
                $("button.select_logic"+counter).remove();

                counter--;
                deleteQuery();//Data Delete



            }
        });

        $(document).on("change", ".select-command", function (e) {

            var target = $(e.target);
            var opt = target.val();
            console.log("selected opt = " + opt);
            $("button.select_logic"+counter).remove();//이전에 모든거지우고 새로추가
            
            if (opt == 'CRAWLING') {
                $('#div_select'+counter).show();
                // var apphtml = $(
                //     "<label for='select-extention' class='select ui-hidden-accessible'>select extention</label>" +
                //
                //     '<div class="ui-select">'+
                //         "<select name='select-extention' class='select-extention' data-native-menu='true' id='select_extention" + counter + "'>" +
                //         "<option value='default'>Select commands</option>" +
                //         "<option value='TXT'>TXT</option>" +
                //         "<option value='PNG'>PNG</option>" +
                //         "<option value='PICKLE'>PICKLE</option>" +
                //         "<option value='JSON'>JSON</option>" +
                //         "<option value='PDF'>PDF</option>" +
                //         "</select></div>");
                // // $(apphtml).appendTo($(e.target).parent()).parent().trigger("create");
                //
                // // console.log(($(e.target).parent()).parent());
                // $(apphtml).appendTo($('#div_select'+counter));


            }

            if (opt == 'IF' || opt === 'ELSE' || opt === 'ELIF' || opt === 'FOR') {
                var apphtml;
                switch (opt) {
                    case 'IF':
                        apphtml = $("<div data-role='controlgroup ui-block-b' >" +
                            "<button type='button' data-theme='b' data-icon='arrow-r' data-mini='true' id='select_if" + counter + "' class='select_logic" + counter + "'>IF</button>" +
                            "</div>");
                        break;
                    case 'ELSE':
                        apphtml = $(
                            "<div data-role='controlgroup ui-block-b' >" +
                            "<button type='button' data-theme='b' data-icon='arrow-r' data-mini='true' id='select_else" + counter + "' class='select_logic" + counter + "'>ELSE</button>" +
                            "</div>");
                        break;
                    case 'ELIF':
                        apphtml = $(
                            "<div data-role='controlgroup ui-block-b' >" +
                            "<button type='button' data-theme='b' data-icon='arrow-r' data-mini='true' id='select_elif" + counter + "' class='select_logic" + counter + "'>ELIF</button>" +
                            "</div>");
                        break;
                    case 'FOR':
                        apphtml = $(
                            "<div data-role='controlgroup ui-block-b' >" +
                            "<button type='button' data-theme='b' data-icon='arrow-r' data-mini='true' id='select_for" + counter + "' class='select_logic" + counter + "'>FOR</button>" +
                            "</div>");
                        break;
                }

                $(apphtml).prependTo($(e.target).parent().parent().parent().parent().parent()).trigger("create");
                //$ele.attr('disabled', true); //추가된거 Disable하는 로직인가?
            }
            if (opt == 'END') {
                var $ele,
                    apphtml = $(
                        "<div data-role='controlgroup ui-block-b' >" +
                        "<button type='button' data-theme='b' data-icon='arrow-l' data-mini='true' id='select_end" + counter + "' class='select_logic" + counter + "'>END</button>" +
                        "</div>");

                $ele = $(apphtml).appendTo($(e.target).parent().parent().parent().parent().parent()).trigger("create");
                $ele.attr("id", "select-extention" + counter);
                $ele.attr('disabled', true);
            }
        });


        $("#append", e.target).on("click", function (e) {
            console.log("append counter >> " + counter);

            var command = $('select#select_command' + counter).val();
            if ("Select commands" == command) {
                //아무것도 입력안하고 전송함을 방지 한다.
                alert('Select Commands !')
                return;
            }


            counter++;

            var group = $("#my-controlgroup");
            var addHTML = $(
                // "<form action='#' method='get'>"+
                "</br> <div class=defaultaction' id='form" + counter + "' >" +
                "<div class='ui-body ui-body-a ui-corner-all action-box' data-theme='a'>" +
                "<div data-role='control group' class='action-object'>" +
                "<div data-role='ui-field-contain'>" +
                "<label for='name'>xPath:</label>" +
                "<input type='text' name='name' class='name' value='' id='x_path" + counter + "'/>" +
                "</div>" +
                "<div data-role='ui-field-contain'>" +
                "<label for='inputText'>Text Input:</label>" +
                "<input type='text' name='inputText' class='inputText' value='' id='input_text" + counter + "'/>" +
                "</div>" +
                "<div data-role='ui-field-contain'>" +
                "<label for='select-command' class='select ui-hidden-accessible'>Commands:</label>" +
                "<select name='select-command' class='select-command' data-native-menu='false' id='select_command" + counter + "'>" +
                "<option>Select commands</option>" +
                "<option value='URL'>URL</option>" +
                "<option value='INPUT'>INPUT</option>" +
                "<option value='CLICK'>CLICK</option>" +
                "<option value='CRAWLING'>CRAWLING</option>" +
                "<option value='IF'>IF</option>" +
                "<option value='ELIF'>ELIF</option>" +
                "<option value='ELSE'>ELSE</option>" +
                "<option value='FOR'>FOR</option>" +
                "<option value='END'>END</option>" +
                "</select>" +
                "</div>" +
                "<div data-role='ui-field-contain' id='div_select"+ counter + "' hidden>" +
                "<label for='select-extention' class='select ui-hidden-accessible'>Select extention</label>"+
                "<select name='select-extention' class='select-extention' id='select_extention1'>"+
                "<option>Select Extention</option>"+
                "<option value='TXT'>TXT</option>"+
                "<option value='PNG'>PNG</option>"+
                "<option value='PICKLE'>PICKLE</option>"+
                "<option value='JSON'>JSON</option>"+
                "<option value='PDF'>PDF</option>"+
                "</select>"+
                "</div>" +
                "<div data-role='ui-field-contain ui-block-b' >" +
                "<label class='information'>Contents</label></div> " +
                "</div>" +
                "</div>");

            //TODO el 지워도 되는 것같다.
            $el = $(addHTML).appendTo($(".defaultaction:last").parent()).trigger("create");

            addQuery();

            group.controlgroup("refresh");
        });
    });
})(jQuery);

