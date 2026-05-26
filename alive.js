const data = {
  signalsQuantity: 0,
  effectsQuantity: 0,
  
  allKeyText: {},
  allKeyOtherParam: {},
  
  allKeyEffect: {},
  allDataEffect: {},
  
  allKeyClearEffect: {},
};


//надійна перевірка типів
const getType = (value) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();


//batching (batch, батчинг)!
const keysToUpdate = new Set();
const idsEffects = new Set();
let isBatchingScheduled = false;


function batchUpdate() {
  keysToUpdate.forEach(key => {
    updateText(key);
    updateOtherParam(key);
    
    addIdsEffects(key);
  });
  
  keysToUpdate.clear();
  isBatchingScheduled = false;
}


//створення синхронізованих змінних (аналог useState та useReducer)
export function createSignal(reducer, param) {
  data.signalsQuantity ++;
  const value = reducer && param || reducer && param === null || reducer === null && param || reducer === null && param === null ? param : reducer;
  const keySignal = data.signalsQuantity;
  let myValue = value;
  
  function getValue(type) {
    if (type == 'key') {
      return keySignal;
    }
    else if (type) {
      return (subType) => {
        if (subType == 'key') {
          return keySignal;
        }
        const [path, dataPath] = getPathValue(type);
        const {keyType, lastKeyPath, value} = dataPath;
        
        return keyType == 'standard' ? path[lastKeyPath] : path[lastKeyPath](value);
      };
    }
    else {
      return myValue;
    }
  }
  
  function setValue(params) {
    let path, team, key, newValue;
    if (getType(params) == 'object' && params.team) {
      ({path, team, key, newValue} = params);
    } else {
      newValue = params;
    }
    
    if (team) {
      newValue = nestedDataNewValue({path, team, key, newValue});
    }
    
    const val = reducer && param || reducer && param === null ? reducer(newValue) : newValue;
    
    if (getType(value) != 'object' && getType(value) != 'array' && getType(value) != 'map' && getType(value) != 'set') {
      if (myValue === val) return;
    }
    
    myValue = val;
    keysToUpdate.add(keySignal);
    
    if (!isBatchingScheduled) {
      isBatchingScheduled = true;
      queueMicrotask(() => {
        batchUpdate();
        updateEffect();
      });
    }
  }
  
  function getPathValue(pathValue) {
    if (!pathValue) {
      return [undefined, {
        keyType: undefined,
        lastKeyPath: undefined,
        value: undefined,
      }];
    }
    const keysPath = pathValue.replace(/\(/g, '.').split('.');
    const functionPath = {};
    let finalPath = myValue;
    let lastKeyPath = null;
    let keyType = 'standard';
    let value;
    
    for (let i = 1; i < keysPath.length; i++) {
      const e = keysPath[i];
      if (e.includes(')')) {
        const valueFunctionPath = e.replace(/\'+|\"+|\`+|\)+/g, '').trim();
        functionPath[i - 1] = valueFunctionPath;
        keysPath.splice(i, 1);
        i--;
      }
    }
    
    keysPath.forEach((e, i) => {
      if (i == keysPath.length - 1) {
        lastKeyPath = e;
        if (functionPath[i] !== undefined) {
          keyType = 'function';
          value = functionPath[i];
        }
        return;
      }
      if (functionPath[i] !== undefined) {
        finalPath = finalPath[e](functionPath[i]);
      } else {
        finalPath = finalPath[e];
      }
    });
    
    return [finalPath, {
      keyType,
      lastKeyPath,
      value,
    }];
  }
  
  function nestedDataNewValue({path, key, team, newValue}) {
    const [pathValue, dataPath] = getPathValue(path);
    const {keyType, lastKeyPath, value} = dataPath;
    
    switch (team) {
      case '=': pathValue ? pathValue[lastKeyPath] = newValue : myValue = newValue; break;
      case '+=': pathValue ? pathValue[lastKeyPath] += newValue : myValue += newValue; break;
      case '-=': pathValue ? pathValue[lastKeyPath] -= newValue : myValue -= newValue; break;
      case '*=': pathValue ? pathValue[lastKeyPath] *= newValue : myValue *= newValue; break;
      case '/=': pathValue ? pathValue[lastKeyPath] /= newValue : myValue /= newValue; break;
      case '%=': pathValue ? pathValue[lastKeyPath] %= newValue : myValue %= newValue; break;
      case '**=': pathValue ? pathValue[lastKeyPath] **= newValue : myValue **= newValue; break;
      default: {
        const target = pathValue ? pathValue[lastKeyPath] : myValue;
        target[team](...(key ? (newValue ? [key, newValue] : [key]) : (newValue ? [newValue] : [])));
      }
    }
    return myValue;
  }
  
  return [getValue, setValue];
}



//оновлення тексту для конкретного елемента (через textContent)
function updateText(key) {
  if (!data.allKeyText[key]) return;
  
  for (let i = data.allKeyText[key].length - 1; i >= 0; i--) {
    const {
      el,
      text,
      nodeText,
    } = data.allKeyText[key][i];
    
    if (!el.isConnected || !nodeText.text.isConnected) {
      data.allKeyText[key].splice(i, 1);
    } else {
      newText(el, text, nodeText);
    }
  }
}


export function setText(el, text) {
  const nodeText = {text: document.createTextNode('')};
  el.append(nodeText.text);
  
  if (Array.isArray(text)) {
    text.forEach(e => {
      getType(e) == 'function' && e('key') ? addDataText(el, text, nodeText, e('key')) : null;
    });
  } 
  else if (getType(text) == 'function' && text('key')) {
    addDataText(el, text, nodeText, text('key'));
  }
  else {
    newText(el, text, nodeText);
  }
}

function addDataText(el, text, nodeText, key) {
  if (!Array.isArray(data.allKeyText[key])) {
    data.allKeyText[key] = [];
  }
  data.allKeyText[key].push({
    el,
    text,
    nodeText,
  });
  
  newText(el, text, nodeText);
}


function newText(el, text, nodeText) {
  if (Array.isArray(text)) {
    let finalText = '';
    
    text.forEach(e => {
      finalText += getType(e) == 'function' ? e() : e;
    });
    nodeText.text.data = finalText;
  } 
  else if (getType(text) == 'function' && text && text('key')) {
    nodeText.text.data = text();
  }
  else {
    nodeText.text.data = text;
  }
}



//оновлення html елементів, та іх створення через append
export function setAppend(el, code) {
  const elements = getType(code) == 'function' ? code(newElement) : code;
  
  elements.forEach(e => {
    if (getType(e) == 'object') {
      const {elType, elParam, elContent} = e;
      if (!elType) return;
      createEl(el, elType, elParam, elContent);
    } else {
      setText(el, e);
    }
  });
}

function newElement(elType, elParam, ...elContent) {
  if (!elType) return;
  return {elType, elParam, elContent};
}

function createEl(el, elType, elParam, elContent) {
  const newEl = document.createElement(elType);
  
  if (elParam && getType(elParam) == 'object') {
    for (const key in elParam) {
      if (key == 'style' || key == 'dataset' || key == 'classList') {
        for (const key2 in elParam[key]) {
          if (key == 'classList') {
            newEl[key][key2](elParam[key][key2]);
          } else {
            newEl[key][key2] = elParam[key][key2];
          }
        }
      } 
      else if (key == 'setParams') {
        setParams(newEl, elParam[key]);
      }
      else {
        newEl[key] = elParam[key];
      }
    }
  }
  
  el.append(newEl);
  setAppend(newEl, elContent);
}





//реактивні параметри!
function setParams(el, params) {
  params.forEach(param => {
    if (typeof param[0] == 'string' && getType(param[1]) == 'function' && param[1]('key')) {
      addDataOtherParam(el, {type: param[0], key: param[1]('key'), param: param[1]});
    }
    else if (typeof param[0] == 'string' && getType(param[1]) == 'object') {
      for (const key in param[1]) {
        addDataOtherParam(el, {type: param[0], type2: key, key : param[1][key]('key'), param: param[1][key]});
      }
    }
  });
}



//реактивні inline стилі!
export function setStyle(el, param) {
  setOtherParam(el, 'style', param);
}

//реактивні класи className!
export function setClassName(el, param) {
  setOtherParam(el, 'className', param);
}

//реактивні класи classList!
export function setClassList(el, param) {
  setOtherParam(el, 'classList', param);
}

//реактивні data-атрибути!
export function setDataset(el, param) {
  setOtherParam(el, 'dataset', param);
}


//інші реактивні параметри!
export function setOtherParam(el, type, param) {
  if (param && getType(param) == 'object') {
    for (const key in param) {
      if (param[key]('key')) {
        addDataOtherParam(el, {key: param[key]('key'), type, type2: key, param: param[key]});
      } else {
        newOtherParam(el, {type, type2: key, param: param[key]});
      }
    }
  }
  else if (param && typeof param != 'object') {
    if (param('key')) {
      addDataOtherParam(el, {key: param('key'), type, type2: null, param});
    } else {
      newOtherParam(el, {type, type2: null, param})
    }
  }
}

function addDataOtherParam(el, {key, type, type2, param}) {
  if (!Array.isArray(data.allKeyOtherParam[key])) {
    data.allKeyOtherParam[key] = [];
  }
  data.allKeyOtherParam[key].push({
    el,
    type,
    type2,
    param,
  });
  
  newOtherParam(el, {type, type2, param: param()});
}

function newOtherParam(el, {type, type2, param}) {
  if (type == 'classList') {
    type2 ? el[type][type2](param) : el[type](param);
  } else {
    type2 ? el[type][type2] = param : el[type] = param;
  }
}

function updateOtherParam(key) {
  if (!data.allKeyOtherParam[key]) return;
  
  for (let i = data.allKeyOtherParam[key].length - 1; i >= 0; i--) {
    const {
      el,
      type,
      type2,
      param,
    } = data.allKeyOtherParam[key][i];
    
    if (!el.isConnected) {
      data.allKeyOtherParam[key].splice(i, 1);
    } else {
      newOtherParam(el, {type, type2, param: param()});
    }
  }
}




//createEffect, аналог useEffect
export function createEffect(code, signals, clearCheck) {
  data.effectsQuantity ++;
  const id = data.effectsQuantity;
  
  data.allKeyClearEffect[id] = false;
  
  const clearFunction = code(removeEffect);
  if (!signals) return;
  
  signals.forEach(e => {
    if (getType(e) == 'function' && e('key')) {
      !data.allKeyEffect[e('key')] ? data.allKeyEffect[e('key')] = [] : null;
      data.allKeyEffect[e('key')].push(id);
    }
  });
  
  data.allDataEffect[id] = {
    clearCheck,
    keyClear: id,
    code,
    clearFunction,
    removeEffect,
  };
  
  
  function removeEffect() {
    delete data.allKeyClearEffect[id];
    delete data.allDataEffect[id];
    
    signals.forEach(e => {
      if (getType(e) == 'function' && e('key')) {
        data.allKeyEffect[e('key')] = data.allKeyEffect[e('key')].filter(effectId => effectId != id);
        if (data.allKeyEffect[e('key')].length == 0) {
          delete data.allKeyEffect[e('key')];
        }
      }
    });
  }
}

function updateEffect() {
  idsEffects.forEach(e => {
    if (!data.allDataEffect[e]) return;
    
    const {
      clearCheck,
      keyClear,
      code,
      clearFunction,
      removeEffect,
    } = data.allDataEffect[e];
    
    if (!clearCheck) {
      data.allDataEffect[e].clearFunction = code(removeEffect);
    } else {
      const check = clearCheck();
      
      if (!check) data.allKeyClearEffect[keyClear] = false;
      if (data.allKeyClearEffect[keyClear]) return;
      
      if (check) {
        data.allKeyClearEffect[keyClear] = true;
        clearFunction();
      } else {
        data.allDataEffect[e].clearFunction = code(removeEffect);
      }
    }
  });
  idsEffects.clear();
}

function addIdsEffects(key) {
  if (!data.allKeyEffect[key]) return;
  data.allKeyEffect[key].forEach(e => idsEffects.add(e));
}




//експорт всіх утиліт
export const Alive = {
  createSignal,
  createEffect,
  
  setAppend,
  
  setText,
  setStyle,
  setClassName,
  setClassList,
  setDataset,
  setOtherParam,
};
