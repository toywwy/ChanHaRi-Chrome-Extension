[ChanHaRi Extension]

default : background.html / background.js
1. extension icon 클릭시 background.js 핸들러 동작하여 bar.html를 띄움
2. bar.js에서 동적으로 웹페이지상의 html코드 내에 bar.html 코드를 삽입.

<py>
server.py : extension에서 요청한 프로토콜 분석하여 웹드라이버 실행하는 서버

<html>
background.html : 비어있는 default
bar.html : ChanHaRi Extension의 큰 구조를 담당

<css>
bar.css : extension 내부의 각 구조를 담당
content.css : extension 큰 틀의 css를 담당. (size, float, font 등)
index.css : bootstrap 담당

<js>
background.js : extension icon 클릭 이벤트 핸들러
bar.js : extension 전체 동작 담당
content.js : extension 큰 틀의 컨트롤러

<json>
manifest.json : extension의 기본 환경설정
command.json : server와 주고받을 프로토콜 예제


