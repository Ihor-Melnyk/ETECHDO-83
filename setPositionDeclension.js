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
    secondWord = arrForPositionName?.[1] || null;
    wordEnding = arrForPositionName?.slice(2) || null;

    //перше слово прикметник, відмінюються два слова (перше і друге)
    if (firstWord.search(/(ий)$/) != -1) {
      firstWord = firstWord.replace(/(ий)$/, "ого");
      secondWord = secondWord.replace(/([бвгґджзклмнпрстфхцчшщ])$/, secondWord.slice(-1) + "а");
    }
    //перше слово закінчення на приголосну
    if (firstWord.search(/([бвгґджзклмнпрстфхцчшщ])$/) != -1) {
      firstWord = firstWord.replace(/([бвгґджзклмнпрстфхцчшщ])$/, firstWord.slice(-1) + "а");
    }

    positionName = `${firstWord} ${secondWord} ${wordEnding.join(" ")}`;
  }
  return positionName;
}
