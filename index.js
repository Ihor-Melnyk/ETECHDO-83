function setAttrValue(nameAttr, valueAttr) {
  var attr = EdocsApi.getAttributeValue(nameAttr);
  if (!attr) return;
  attr.value = valueAttr;
  EdocsApi.setAttributeValue(attr);
}

function getDaysFromTo(dateFrom, dateTo, error) {
  validationDate(dateFrom, dateTo, error);
  return EdocsApi.getVacationDaysCount(dateFrom, dateTo);
}

function getVacationDaysCount(dateFrom, dateTo) {
  return getDaysFromTo(dateFrom, dateTo, "Введені значення некоректні. Дата закінчення відпустки не може бути раніше дати початку відпустки");
}

function validationDate(dateFrom, dateTo, error) {
  if (new Date(dateFrom) > new Date(dateTo)) throw error;
}

function getWorkDayCount(dateFrom, dateTo) {
  if (dateFrom >= dateTo) return 0;
  var date = new Date(dateFrom);
  var count = 0;

  while (date < dateTo) {
    var currentDay = date.getDay();
    date.setDate(date.getDate() + 1);

    if (date > dateFrom && date.valueOf() == dateTo.valueOf()) {
      break;
    }
    if (currentDay === 6 || currentDay === 7) {
      continue;
    }
    count++;
  }
  return count;
}

function validationDateFrom(dateFrom, dateTo) {
  validationDate(dateFrom, dateTo, "Введені значення некоректні. Дата початку відпустки не може бути раніше дати заяви");
  if (getWorkDayCount(new Date(dateFrom), new Date(dateTo)) < 5) {
    throw "Введені значення некоректні. Заяву на відпустку можливо створити не пізніше ніж за 5 робочих днів. до дати початку відпустки";
  }
}

function setVacationDays() {
  var attrdateSince = EdocsApi.getAttributeValue("dateSince");
  var attrdateTo = EdocsApi.getAttributeValue("dateTo");

  if (!attrdateSince.value || !attrdateTo.value) return;
  var vacationType = EdocsApi.getAttributeValue("vacationType");
  if (vacationType.value && (vacationType.value == "відпустку без збереження заробітної плати" || vacationType.value == "по вагітності та пологам" || vacationType.value == "відпустка при народженні дитини")) {
    setAttrValue("days", getVacationDaysCount(attrdateSince.value, attrdateTo.value));
  } else {
    var attrDateOfApplication = EdocsApi.getAttributeValue("DateOfApplication");
    if (attrDateOfApplication.value) {
      var attrRegistrationType = EdocsApi.getAttributeValue("RegistrationType");
      if (attrRegistrationType.value && attrRegistrationType.value == "Штат") {
        validationDateFrom(attrDateOfApplication.value, attrdateSince.value);
      }
      setAttrValue("days", getVacationDaysCount(attrdateSince.value, attrdateTo.value));
    }
  }
}

function onCreate() {
  setInitiatorOrg(true);
  EdocsApi.setAttributeValue({ code: "SignType", value: "Підписання паперової копії" });
}

function onChangeInitiator() {
  setInitiatorOrg();
}

function setInitiatorOrg(isCreate = false) {
  var employeeId;

  if (isCreate) {
    employeeId = CurrentDocument.initiatorId;
  } else {
    employeeId = EdocsApi.getAttributeValue("Initiator").value;
  }

  var empoyeeData = EdocsApi.getEmployeeDataByEmployeeID(employeeId);
  if (empoyeeData) {
    setAttrValue("RegistrationType", empoyeeData.phone1);
    setAttrValue("InitiatorOrg", empoyeeData.phone3);
    setAttrValue("DateOfApplication", new Date());

    // обʼєкт із властивостями для відмінювання
    const objFullName = setObjFullNameByFullNameString(empoyeeData.fullName);

    //перевірка довідника на наявність прізвища "прикметрикового типу"
    setLastNameType(objFullName);

    const declineLastName = declineLastNameCase(objFullName.lastName, objFullName.gender, objFullName.lastNameType, (caseType = "genitive"));
    const declineFirstName = declineFirstNameCase(objFullName.firstName, objFullName.gender, (caseType = "genitive"));

    setAttrValue("FirstNameLastNameDeclension", `${declineFirstName} ${declineLastName.toUpperCase()}`);
  } else {
    setAttrValue("FirstNameLastNameDeclension", "");
    setAttrValue("RegistrationType", "");
    setAttrValue("InitiatorOrg", "");
    setAttrValue("DateOfApplication", "");
  }
}

// ===========================
//функціонал відмінювання ПІБ у родовому відмінку
//функція створює обʼєкт із властивостями для відмінювання
function setObjFullNameByFullNameString(fullName) {
  if (fullName) {
    const arrayFullName = fullName.split(" ");
    const objFullName = {
      gender: setGenderByPatronymic(arrayFullName[2]),
      lastName: arrayFullName?.[0] || "",
      firstName: arrayFullName?.[1] || "",
      patronymic: arrayFullName?.[2] ? arrayFullName?.[2] : EdocsApi.message(`для правильного відмінювання, зверніться до адміністратора eDocs, щоб внести "По батькові"`),
      lastNameType: "noun",
    };
    return objFullName;
  }
}

//функція  визначає стать за "По батькові", якщо "По батькові" не заповнено, по замовчуванню отримаємо чоловічу стать
function setGenderByPatronymic(patronymic) {
  return !patronymic ? "male" : patronymic.endsWith("вна") ? "female" : "male";
}

//функція  перевіряє наявність прізвища у довідника "прикметникових прізвищ", якщо прізвище присутнє, то змінюємо властивість обʼєкта "тип прізвища"
function setLastNameType(objFullName) {
  var data = EdocsApi.getDictionaryData("AdjectiveSurName", objFullName.lastName.toLowerCase());
  if (data.length) {
    if (data.find((x) => x.code == objFullName.lastName.toLowerCase())) objFullName.lastNameType = "adjective";
  }
  return objFullName;
}

//функція відмінює прізвище
function declineLastNameCase(lastName, gender, lastNameType, caseType = "genitive") {
  debugger;
  if (lastNameType === "noun") {
    if (caseType === "genitive") {
      if (gender === "male") {
        lastName = lastName
          .replace(/а$/, "и") // закінчення на "а"
          .replace(/я$/, "і") // закінчення на "я"
          .replace(/(ьо|й)$/, "я") // закінчення на "ьо", "й"
          .replace(/єць$/, "йця") // закінчення на "єць"
          .replace(/ець$/, "ця") // закінчення на "ець"
          .replace(/(і[бвгґджзклмнпрстфхцчшщ]ь)$/, "е" + lastName.slice(-2, -1) + "я") // закінчення на "і"+приголосна+"ь"
          .replace(/([бвгґджзклмнпрстфхцчшщ]ь)$/, lastName.slice(-2, -1) + "я") // закінчення на приголосна+"ь"
          .replace(/(і[бвгґджзклмнпрстфхцчшщ])$/, "о" + lastName.slice(-1) + "а") // закінчення на "і"+приголосна
          .replace(/([бвгґджзклмнпрстфхцчшщ])$/, lastName.slice(-1) + "а") // закінчення на приголосну
          .replace(/о$/, "а"); // закінчення на "о"
      } else if (gender === "female") {
        lastName = lastName
          .replace(/а$/, "и") // закінчення на "а"
          .replace(/я$/, "і"); // закінчення на "я"
      }
    }
  } else if (lastNameType === "adjective") {
    if (caseType === "genitive") {
      if (gender === "male") {
        lastName = lastName
          .replace(/(ой|ий)$/, "ого") // закінчення на "ой", "ий"
          .replace(/ій$/, "ього") // закінчення на "ій"
          .replace(/ов$/, "ова") // закінчення на "ов"
          .replace(/єв$/, "єва") // закінчення на "єв"
          .replace(/ів$/, "іва") // закінчення на "ів"
          .replace(/їв$/, "їва") // закінчення на "їв"
          .replace(/ин$/, "ина") // закінчення на "ин"
          .replace(/ін$/, "іна") // закінчення на "ін"
          .replace(/їн$/, "їна"); // закінчення на "їн"
      } else if (gender === "female") {
        lastName = lastName
          .replace(/(а)$/, "ої") // закінчення на "а"
          .replace(/([бвгґджзклмнпрстфхцчшщ]я)$/, lastName.slice(-2, -1) + "ьої"); // закінчення на приголосна+"я"
      }
    }
  }
  return lastName;
}

//функція відмінює імʼя у родовому відмінку
function declineFirstNameCase(firstName, gender, caseType = "genitive") {
  if (caseType === "genitive") {
    if (gender === "male") {
      firstName = firstName
        .replace(/(і[бвгґджзклмнпрстфхцчшщ])$/, "о" + firstName.slice(-1) + "а") // закінчення на "і"+приголосна
        .replace(/а$/, "и") // закінчення на "а";
        .replace(/я$/, "і") // закінчення на "я";
        .replace(/[уеіаоєяию]й$/, firstName.slice(-1) + "я") // закінчення на голосну+"й";
        .replace(/(Ігор)$/, firstName + "я") // вийняток "Ігор"
        .replace(/(Лазар)$/, firstName + "я") // вийняток "Лазар"
        .replace(/([бвгґджзклмнпрстфхцчшщ])$/, firstName.slice(-1) + "а") // закінчення на приголосну
        .replace(/(Лаврін)$/, firstName + "а") // вийняток "Лаврін"
        .replace(/(Олефір)$/, firstName + "а") // вийняток "Олефір"
        .replace(/(і[бвгґджзклмнпрстфхцчшщ])$/, "о" + firstName.slice(-1) + "а") // закінчення на "і"+приголосна
        .replace(/([бвгґджзклмнпрстфхцчшщ]о)$/, firstName.slice(-2, -1) + "а"); // закінчення на приголосна+"о";
    } else if (gender === "female") {
      firstName = firstName
        .replace(/([бвгґджзклмнпрстфхцчшщ])$/, firstName.slice(-1) + "і") // закінчення на приголосну
        .replace(/іа$/, "іі") // закінчення на "іа";
        .replace(/а$/, "и") // закінчення на "а";
        .replace(/ія$/, "ії") // закінчення на "ія";
        .replace(/(я|ь)$/, "і"); // закінчення на "я" або "ь";
    }
  }
  return firstName;
}

function setEmployeeManagers() {
  var unitLevel = EdocsApi.getEmployeeDataByEmployeeID(CurrentDocument.initiatorId).unitLevel;
  var result = [];
  var resultText = "";

  while (unitLevel > 0) {
    var manager = EdocsApi.getEmployeeManagerByEmployeeID(CurrentDocument.initiatorId, unitLevel);

    if (manager && manager.employeeId != CurrentDocument.initiatorId) {
      result.push({
        employeeId: manager.employeeId,
        employeeName: manager.shortName,
        id: 0,
        index: result.length,
        positionName: manager.positionName,
      });
      resultText += manager.shortName + "\n";
    }
    unitLevel--;
  }
  var attrEmployeeManagers = EdocsApi.getAttributeValue("EmployeeManagers");

  attrEmployeeManagers.value = JSON.stringify(result);
  attrEmployeeManagers.text = resultText;
  EdocsApi.setAttributeValue(attrEmployeeManagers);
}

function onBeforeCardSave() {
  setVacationDays();
  setEmployeeManagers();
}
