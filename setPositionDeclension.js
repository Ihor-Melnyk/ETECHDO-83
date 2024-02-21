//positionDeclension
function setPositionDeclension(positionName, caseType = "genitive") {
  if (positionName) {
    //масив похідних слів
    var derivativeArray = ["заступник", "віце-", "перший", "другий", "тpетій", "четвертий", "п'ятий", "бригадний", "змінний", "груповий", "дільничний", "головний", "провідний", "старший", "молодший", "черговий", "районний", "гірничий", "помічник", "стажист", "учень"];
    var arrayPositionName = positionName.split(" ");
    var arrForPositionName = [];
    var derivative;
    var firstWord;
    var secondWord;
    var wordEnding;
    for (var index = 0; index < arrayPositionName.length; index++) {
      if (arrayPositionName[index] != "") {
        if (derivativeArray.includes(arrayPositionName[index].toLowerCase())) {
          derivative = arrayPositionName[index];
        } else {
          arrForPositionName.push(arrayPositionName[index]);
        }
      }
    }
    firstWord = arrForPositionName[0];
    secondWord = arrForPositionName?.[1] || null;
    wordEnding = arrForPositionName?.slice(2) || null;

    if (caseType == "genitive") {
      //родовий відмінок
      if (derivative)
        //похідне слово
        derivative = derivative
          .replace(/(ень)$/, "ня")
          .replace(/([бвгґджзклмнпрстфхцчшщ])$/, derivative.slice(-1) + "а")
          .replace(/(ий)$/, "ого");
      if (firstWord.search(/(ий)$/) != -1) {
        //перше слово прикметник, відмінюються два слова (перше і друге)
        firstWord = firstWord.replace(/(ий)$/, "ого");
        secondWord = secondWord.replace(/([бвгґджзклмнпрстфхцчшщ])$/, secondWord.slice(-1) + "а");
      }
      //перше слово закінчення на приголосну
      if (firstWord.search(/([бвгґджзклмнпрстфхцчшщ])$/) != -1) {
        firstWord = firstWord.replace(/([бвгґджзклмнпрстфхцчшщ])$/, firstWord.slice(-1) + "а");
      }
    } else if (caseType == "dative") {
      //давальний відмінок
      if (derivative)
        //похідне слово
        derivative = derivative
          .replace(/(ень)$/, "ню")
          .replace(/([бвгґджзклмнпрстфхцчшщ])$/, derivative.slice(-1) + "у")
          .replace(/(ий)$/, "ому");
      if (firstWord.search(/(ий)$/) != -1) {
        //перше слово прикметник, відмінюються два слова (перше і друге)
        firstWord = firstWord.replace(/(ий)$/, "ому");
        secondWord = secondWord.replace(/([бвгґджзклмнпрстфхцчшщ])$/, secondWord.slice(-1) + "у");
      }
      //перше слово закінчення на приголосну
      if (firstWord.search(/([бвгґджзклмнпрстфхцчшщ])$/) != -1) {
        firstWord = firstWord.replace(/([бвгґджзклмнпрстфхцчшщ])$/, firstWord.slice(-1) + "у");
      }
    } else {
      return positionName;
    }
    positionName = `${derivative ? `${derivative} ` : ""}${firstWord}${secondWord ? ` ${secondWord}` : ""}${wordEnding.length ? ` ${wordEnding.join(" ")}` : ""}`;
  }
  return positionName;
}
