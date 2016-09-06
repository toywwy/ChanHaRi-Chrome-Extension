from flask import Flask, jsonify, render_template, request, make_response
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from flask_cors import CORS, cross_origin
import time
import json
import pickle
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from PIL import Image
import os
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from threading import Thread, Lock
import threading
import sys

app = Flask(__name__)
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

isPlaying = False
prePlaying = False

taskThreadList = []
"""
class taskThread(threading.Thread):
    def __init__(self, name):
        Thread.__init__(self)
        self.name = name
        self.fixed = 0

    def run(self, actions):
        runTask(actions)

"""


def fullpage_screenshot(driver, file):
    print("Starting chrome full page screenshot workaround ...")

    total_width = driver.execute_script("return document.body.offsetWidth")
    total_height = driver.execute_script("return document.body.parentNode.scrollHeight")
    viewport_width = driver.execute_script("return document.body.clientWidth")
    viewport_height = driver.execute_script("return window.innerHeight")
    print("Total: ({0}, {1}), Viewport: ({2},{3})".format(total_width, total_height, viewport_width, viewport_height))
    rectangles = []

    i = 0
    while i < total_height:
        ii = 0
        top_height = i + viewport_height

        if top_height > total_height:
            top_height = total_height

        while ii < total_width:
            top_width = ii + viewport_width

            if top_width > total_width:
                top_width = total_width

            print("Appending rectangle ({0},{1},{2},{3})".format(ii, i, top_width, top_height))
            rectangles.append((ii, i, top_width, top_height))

            ii = ii + viewport_width

        i = i + viewport_height

    stitched_image = Image.new('RGB', (total_width, total_height))
    previous = None
    part = 0

    for rectangle in rectangles:
        if not previous is None:
            driver.execute_script("window.scrollTo({0}, {1})".format(rectangle[0], rectangle[1]))
            print("Scrolled To ({0},{1})".format(rectangle[0], rectangle[1]))
            time.sleep(0.2)

        file_name = "part_{0}.png".format(part)
        print("Capturing {0} ...".format(file_name))

        driver.get_screenshot_as_file(file_name)
        screenshot = Image.open(file_name)

        if rectangle[1] + viewport_height > total_height:
            offset = (rectangle[0], total_height - viewport_height)
        else:
            offset = (rectangle[0], rectangle[1])

        print("Adding to stitched image with offset ({0}, {1})".format(offset[0], offset[1]))
        stitched_image.paste(screenshot, offset)

        del screenshot
        os.remove(file_name)
        part = part + 1
        previous = rectangle

    stitched_image.save(file)
    print("Finishing chrome full page screenshot workaround...")
    return True


def waitForElement(driver, xpath):
    timeout = 5
    try:
        element_present = EC.presence_of_element_located((By.XPATH, xpath))
        WebDriverWait(driver, timeout).until(element_present)
    except TimeoutException:
        errorMessage = "TimeoutException & No Such Element"
        print(errorMessage)


def connectUrl(driver, xpath, contents):
    driver.get(contents[0])


def inputText(driver, xpath, contents):
    splitPath = "//" + xpath.split('/')[-1]
    waitForElement(driver, splitPath)
    driver.find_element_by_xpath(splitPath).send_keys(contents[0])
    return "inputText"


def clickButton(driver, xpath, contents):
    splitPath = "//" + xpath.split('/')[-2] + "/" + xpath.split('/')[-1]
    waitForElement(driver, splitPath)
    driver.find_element_by_xpath(splitPath).click()
    return "clickButton"


def drawImage(driver, element, saveName):
    location = element.location
    size = element.size
    print(location)
    print(size)
    screenshotName = "Screenshot" + threading.current_thread().getName() + ".png"
    fullpage_screenshot(driver, screenshotName)
    # driver.save_screenshot('screenshot.png')
    # time.sleep(2)
    im = Image.open(screenshotName)
    left = location['x']
    top = location['y']
    right = location['x'] + size['width']
    bottom = location['y'] + size['height']

    print(left)
    print(top)
    print(right)
    print(bottom)
    im = im.crop((int(left), int(top), int(right), int(bottom)))
    im.save(saveName)


def drawCanvas(driver, element, saveName, canv):
    drawImage(driver, element, 'pdfTemp.png')
    canv.drawImage('pdfTemp.png', 0, 0)


def onCrawling(driver, xpath, contents):
    splitPath = "//" + xpath.split('/')[-2] + "/" + xpath.split('/')[-1]
    imagePath = "//" + xpath.split('/')[-4] + "/" + xpath.split('/')[-3] + "/" + xpath.split('/')[-2]

    # print(type(targetData))

    if (contents[0] == "PICKLE"):
        waitForElement(driver, splitPath)
        targetData = driver.find_element_by_xpath(splitPath).text
        with open(contents[1], 'wb') as f:
            pickle.dump(targetData, f)

    elif (contents[0] == "JSON"):
        waitForElement(driver, splitPath)
        targetData = driver.find_element_by_xpath(splitPath).text
        with open(contents[1], 'w') as f:
            json.dump(targetData, f, ensure_ascii=False)

    elif (contents[0] == "TXT"):
        waitForElement(driver, splitPath)
        targetData = driver.find_element_by_xpath(splitPath).text
        f = open(contents[1], 'w+')
        f.write(targetData)
        f.close()

    elif (contents[0] == "PNG"):
        print("[PNG]")
        # png = driver.get_screenshot_as_png()
        # open(contents[1], "wb").write(png)
        waitForElement(driver, imagePath)
        element = driver.find_element_by_xpath(imagePath)
        drawImage(driver, element, contents[1])
    elif (contents[0] == "PDF"):
        waitForElement(driver, imagePath)
        element = driver.find_element_by_xpath(imagePath)
        canv = canvas.Canvas(contents[1], pagesize=A4)
        drawCanvas(driver, element, contents[1], canv)
        canv.save()

    return "onCrawling"


def isNumber(s):
    try:
        float(s)
        return True
    except ValueError:
        return False


def onIf(driver, xpath, contents):
    # targetValue = driver.find_element_by_xpath(xpath).get_attribute("text")
    waitForElement(driver, xpath)
    targetValue = driver.find_element_by_xpath(xpath).text
    targetValue = targetValue.strip()

    if (isNumber(targetValue)):
        targetValue = float(targetValue)

    if (contents[0] == "gt"):
        if (targetValue > contents[1]):
            prePlaying = True
            isPlaying = True
            return True
        else:
            prePlaying = False
            isPlaying = False
            return False
    if (contents[0] == "lt"):
        if (targetValue < contents[1]):
            prePlaying = True
            isPlaying = True
            return True
        else:
            prePlaying = False
            isPlaying = False
            return False
    if (contents[0] == "eq"):
        if (targetValue == contents[1]):
            prePlaying = True
            isPlaying = True
            return True
        else:
            prePlaying = False
            isPlaying = False
            return False

    return False


def onElse(driver, xpath, contents):
    if (prePlaying):
        isPlaying = False
    else:
        isPlaying = True

    return "OnElse"


def onFor(driver, xpath, contents):
    return "onFor"


def onEnd(driver, xpath, contents):
    isPlaying = True
    return "onEnd"


commandFunc = {
    "URL": connectUrl,
    "INPUT": inputText,
    "CLICK": clickButton,
    "CRAWLING": onCrawling,
    "IF": onIf,
    "ELIF": onIf,
    "ELSE": onElse,
    "END": onEnd,
    "FOR": onFor
}


def runTask(data):
    driver = webdriver.Chrome("chromedriver.exe")
    driver.maximize_window()
    print(data)
    try:
        for index in range(len(data)):
            result = commandFunc.get(data[index]['command'])(driver, data[index]['xpath'], data[index]['contents'])
    except:
        return jsonify(resultCode=1)


@app.route('/_analysis_json', methods=['GET', 'OPTIONS', 'POST'])
@cross_origin()
def analysis_json():
    print("[analysis_json]")

    isPlaying = True

    # data = json.dumps({})
    ###open local json file
    # if request.method == 'GET':
    #    with open('commands.json') as f:
    #        data = json.load(f)

    ###receive ajax json
    # else:
    # data = request.get_json(force=True)
    try:
        data = request.get_json(force=True)
        print(data)
        print(data["taskId"])
        print(data["actions"])
        curTaskId = data["taskId"]
        curActions = data["actions"]
        # data.taskId  data.actions
    except:
        return jsonify(resultCode=1)

    taskThread = Thread(name=curTaskId, target=runTask, args=[curActions])
    taskThreadList.append(taskThread)
    taskThread.start()
    # taskThread.join()

    # taskThreadElement = taskThread(name="taskId")
    # taskThreadList.append(taskThreadElement)

    # taskThreadElement.start(data)
    # taskThreadElement.run(data)
    # taskThreadElement.join()

    time.sleep(5)
    print("[End : analysis_json]")
    return jsonify(resultCode=1, taskId=taskThread.getName())


@app.route('/_add_numbers', methods=['OPTIONS', 'POST'])
@cross_origin()
# @crossdomain(origin='*')
def add_numbers():
    print("[add_numbers]")
    # print(request)
    # print(request.args)
    # print(request.args.get('xpath'))
    driver = webdriver.Chrome("C:\\JoChanhee\chromedriver.exe")

    driver.get("http://www.naver.com")

    # if request.headers['Content-Type'] == 'application/json':
    #     return "JSON Message: " + json.dumps(request.json)
    # else:
    #     return "415 Unsupported Media Type ;)"
    # print(request.get_json(force=True))
    data = request.get_json(force=True)
    print(data)
    # a = request.args.get('a', 0, type=int)
    # b = request.args.get('b', 0, type=int)
    # return jsonify(result=0)
    # return jsonify(result=0)
    return jsonify(result=0)


@app.route('/')
def index():
    # driver = webdriver.Chrome("C:\\JoChanhee\chromedriver.exe")
    # driver.get("http://www.naver.com")
    # time.sleep(4)
    # return 'Hello World'
    return render_template('index.html')


@app.route('/chanhee')
def chanhee():
    # return render_template('index.html')
    return 'Hi Chanhee'


if __name__ == "__main__":
    app.run(debug=True)