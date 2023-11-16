function setAttrValue(nameAttr, valueAttr) {
  debugger;
  var attr = EdocsApi.getAttributeValue(nameAttr);
  if (!attr) return;
  attr.value = valueAttr;
  EdocsApi.setAttributeValue(attr);
}

function getDaysFromTo(dateFrom, dateTo, error) {
  debugger;
  validationDate(dateFrom, dateTo, error);
  return EdocsApi.getVacationDaysCount(dateFrom, dateTo);
}

function getVacationDaysCount(dateFrom, dateTo) {
  debugger;
  return getDaysFromTo(
    dateFrom,
    dateTo,
    "Введені значення некоректні. Дата закінчення відпустки не може бути раніше дати початку відпустки"
  );
}

function validationDate(dateFrom, dateTo, error) {
  debugger;
  if (new Date(dateFrom) > new Date(dateTo)) {
    throw error;
  }
}

function getWorkDayCount(dateFrom, dateTo) {
  debugger;
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
  debugger;
  validationDate(
    dateFrom,
    dateTo,
    "Введені значення некоректні. Дата початку відпустки не може бути раніше дати заяви"
  );
  if (getWorkDayCount(new Date(dateFrom), new Date(dateTo)) < 5) {
    throw "Введені значення некоректні. Заяву на відпустку можливо створити не пізніше ніж за 5 робочих днів. до дати початку відпустки";
  }
}

function setVacationDays() {
  debugger;
  var attrdateSince = EdocsApi.getAttributeValue("dateSince");
  var attrdateTo = EdocsApi.getAttributeValue("dateTo");

  if (!attrdateSince.value || !attrdateTo.value) return;
  var vacationType = EdocsApi.getAttributeValue("vacationType");
  if (
    vacationType.value &&
    (vacationType.value == "відпустку без збереження заробітної плати" ||
      vacationType.value == "по вагітності та пологам" ||
      vacationType.value == "відпустка при народженні дитини")
  ) {
    setAttrValue(
      "days",
      getVacationDaysCount(attrdateSince.value, attrdateTo.value)
    );
  } else {
    var attrDateOfApplication = EdocsApi.getAttributeValue("DateOfApplication");
    if (attrDateOfApplication.value) {
      var attrRegistrationType = EdocsApi.getAttributeValue("RegistrationType");
      if (attrRegistrationType.value && attrRegistrationType.value == "Штат") {
        validationDateFrom(attrDateOfApplication.value, attrdateSince.value);
      }
      setAttrValue(
        "days",
        getVacationDaysCount(attrdateSince.value, attrdateTo.value)
      );
    }
  }
}

function onCreate() {
  setInitiatorOrg(true);
  EdocsApi.setAttributeValue({
    code: "SignType",
    value: "Підписання паперової копії",
  });
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

    //запис посади в родовому відмінку
    setAttrValue(
      "positionDeclension",
      setPositionDeclension(empoyeeData.positionName)
    );

    // обʼєкт із властивостями для відмінювання
    const objFullName = setObjFullNameByFullNameString(empoyeeData.fullName);

    //перевірка довідника на наявність прізвища "прикметрикового типу"
    setLastNameType(objFullName);

    const declineLastName = declineLastNameCase(
      objFullName.lastName,
      objFullName.gender,
      objFullName.lastNameType,
      (caseType = "genitive")
    );

    const declineFirstName = declineFirstNameCase(
      objFullName.firstName,
      objFullName.gender,
      (caseType = "genitive")
    );

    EdocsApi.setAttributeValue({
      code: "FirstNameLastNameDeclension",
      value: `${declineFirstName} ${declineLastName.toUpperCase()}`,
    });
  } else {
    EdocsApi.setAttributeValue({
      code: "FirstNameLastNameDeclension",
      value: "",
      text: "",
    });
    setAttrValue("RegistrationType", "");
    setAttrValue("InitiatorOrg", "");
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
      patronymic: arrayFullName?.[2]
        ? arrayFullName?.[2]
        : EdocsApi.message(
            `для правильного відмінювання, зверніться до адміністратора eDocs, щоб внести "По батькові"`
          ),
      lastNameType: "noun",
    };
    return objFullName;
  }
}

//функція  визначає стать за "По батькові", якщо "По батькові" не заповнено, по замовчуванню отримаємо чоловічу стать
function setGenderByPatronymic(patronymic) {
  if (!patronymic) return "male";
  let gender;
  patronymic.endsWith("вна") ? (gender = "female") : (gender = "male");
  return gender;
}

//функція  перевіряє наявність прізвища у довідника "прикметникових прізвищ", якщо прізвище присутнє, то змінюємо властивість обʼєкта "тип прізвища"
function setLastNameType(objFullName) {
  //замінити довідник TypeSurName2 на довідник з МОК
  const data = "";
  // const data = EdocsApi.getDictionaryData("TypeSurName2", "", [
  //   { attributeCode: "Title", value: objFullName.lastName.toLowerCase() },
  // ]);
  if (data.length) {
    objFullName.lastNameType = "adjective";
  }
  return objFullName;
}

//функція відмінює прізвище
function declineLastNameCase(
  lastName,
  gender,
  lastNameType,
  caseType = "genitive"
) {
  if (lastNameType === "noun") {
    if (caseType === "genitive") {
      if (gender === "male") {
        lastName = lastName
          .replace(/а$/, "и") // закінчення на "а"
          .replace(/я$/, "і") // закінчення на "я"
          .replace(/(ьо|й)$/, "я") // закінчення на "ьо", "й"
          .replace(/єць$/, "йця") // закінчення на "єць"
          .replace(/ець$/, "ця") // закінчення на "ець"
          .replace(
            /(і[бвгґджзклмнпрстфхцчшщ]ь)$/,
            "е" + lastName.slice(-2, -1) + "я"
          ) // закінчення на "і"+приголосна+"ь"
          .replace(/([бвгґджзклмнпрстфхцчшщ]ь)$/, lastName.slice(-2, -1) + "я") // закінчення на приголосна+"ь"
          .replace(
            /(і[бвгґджзклмнпрстфхцчшщ])$/,
            "о" + lastName.slice(-1) + "а"
          ) // закінчення на "і"+приголосна
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
          .replace(
            /([бвгґджзклмнпрстфхцчшщ]я)$/,
            lastName.slice(-2, -1) + "ьої"
          ); // закінчення на приголосна+"я"
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

// function setLoverCaseName(nameSurname) {
//   var arr = nameSurname?.split(" ");
//   return `${arr[0]} ${arr[1].toUpperCase()}`;
// }

function setEmployeeManagers() {
  var unitLevel = EdocsApi.getEmployeeDataByEmployeeID(
    CurrentDocument.initiatorId
  ).unitLevel;
  var result = [];
  var resultText = "";

  while (unitLevel > 0) {
    var boss = EdocsApi.getEmployeeManagerByEmployeeID(
      CurrentDocument.initiatorId,
      unitLevel
    );

    if (boss && boss.employeeId != CurrentDocument.initiatorId) {
      result.push({
        employeeId: boss.employeeId,
        employeeName: boss.shortName,
        id: 0,
        index: result.length,
        positionName: boss.positionName,
      });

      resultText += boss.shortName + "\n";
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

//positionDeclension
function setPositionDeclension(positionName) {
  if (positionName) {
    const arrayPositionName = positionName.split(" ");
    const arrForPositionName = [];
    let firstWord;
    let secondWord;
    let wordEnding;
    for (let index = 0; index < arrayPositionName.length; index++) {
      if (arrayPositionName[index] != "") {
        arrForPositionName.push(arrayPositionName[index]);
      }
    }
    firstWord = arrForPositionName[0];
    secondWord = arrForPositionName?.[1];
    wordEnding = arrForPositionName.slice(2);

    firstWord = firstWord
      .replace(/(ой|ий)$/, "ого") // закінчення на "ой", "ий"
      .replace(/ій$/, "ього") // закінчення на "ій"
      .replace(/ов$/, "ова") // закінчення на "ов"
      .replace(/єв$/, "єва") // закінчення на "єв"
      .replace(/ів$/, "іва") // закінчення на "ів"
      .replace(/їв$/, "їва") // закінчення на "їв"
      .replace(/ин$/, "ина") // закінчення на "ин"
      .replace(/ін$/, "іна") // закінчення на "ін"
      .replace(/їн$/, "їна"); // закінчення на "їн"

    positionName = `${firstWord} ${secondWord} ${wordEnding.join(" ")}`;
  }
  return positionName;
}
