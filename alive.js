const data = {
  signalsQuantity: 0,
  effectsQuantity: 0,
  
  allSubscribers: {},
  
  allKeyEffect: {},
  allDataEffect: {},
  
  allKeyClearEffect: {},
  
  currentListener: null,
};


//надійна перевірка типів
const getType = (value) => Object.prototype.toString.call(value).slice(8, -1).toLowerCase();


//batching (batch, батчинг)!
const keysToUpdate = new Set();
const idsEffects = new Set();
let isBatchingScheduled = false;


function batchUpdate() {
  for (const key of keysToUpdate) {
    updateSubscriptions(key);
    addIdsEffects(key);
  }
  
  keysToUpdate.clear();
  isBatchingScheduled = false;
}


//створення синхронізованих змінних (аналог useState та useReducer)
export function createSignal(reducer, param) {
  data.signalsQuantity ++;
  const signalArguments = arguments.length;
  const value = signalArguments == 2 ? param : reducer;
  const keySignal = data.signalsQuantity;
  let myValue = value;
  
  function getValue(type) {
    if (type == 'key') {
      return keySignal;
    }
    
    if (data.currentListener) {
      trackSubscriptions(keySignal, data.currentListener);
    }
    
    if (type) {
      return (subType) => {
        if (subType == 'key') {
          return keySignal;
        }
        
        if (data.currentListener) {
          trackSubscriptions(keySignal, data.currentListener);
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
    
    const val = signalArguments == 2 ? reducer(newValue) : newValue;
    
    if (getType(myValue) != 'object' && getType(myValue) != 'array' && getType(myValue) != 'map' && getType(myValue) != 'set') {
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
    
    for (let i = 0; i < keysPath.length; i++) {
      const e = keysPath[i];
      
      if (i == keysPath.length - 1) {
        lastKeyPath = e;
        if (functionPath[i] !== undefined) {
          keyType = 'function';
          value = functionPath[i];
        }
        continue;
      }
      if (functionPath[i] !== undefined) {
        finalPath = finalPath[e](functionPath[i]);
      } 
      else {
        finalPath = finalPath[e];
      }
    }
    
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
export function setText(el, text) {
  const nodeText = document.createTextNode('');
  
  bindReactive(nodeText, text, (value) => nodeText.data = value);
  el.append(nodeText);
}



//оновлення html елементів, та іх створення через append
export function setAppend(el, code, elNewTypeNS = 'xhtml') {
  const elements = getType(code) == 'function' ? code(newElement) : code;
  
  for (const e of elements) {
    if (getType(e) == 'object') {
      const {elType, elTypeNS, elParams, elContent} = e;
      
      if (!elType) continue;
      if (elTypeNS) {
        elNewTypeNS = elTypeNS;
      }
      
      createEl(el, elType, elNewTypeNS, elParams, elContent);
    } 
    else {
      setText(el, e);
    }
  }
}

function newElement(elType, elParams, ...elContent) {
  if (!elType) return;
  
  let elTypeNS;
  
  if (['svg', 'math'].includes(elType)) {
    elTypeNS = elType;
  }
  else if (['foreignObject', 'annotation-xml', 'mtext'].includes(elType)) {
    elTypeNS = 'xhtml';
  }
  
  return {elType, elTypeNS, elParams, elContent};
}

function createEl(el, elType, elTypeNS, elParams, elContent) {
  const elementNS = {
    xhtml: 'http://www.w3.org/1999/xhtml',
    svg: 'http://www.w3.org/2000/svg',
    math: 'http://www.w3.org/1998/Math/MathML',
  };
  
  const newEl = document.createElementNS(elementNS[elTypeNS], elType);
  
  setParams(newEl, elTypeNS, elParams);
  el.append(newEl);
  setAppend(newEl, elContent, elTypeNS);
}





//реактивні параметри!
function setParams(newEl, elTypeNS, elParams) {
  if (!elParams || getType(elParams) != 'object') return;
  
  for (const key in elParams) {
    if (key == 'onclick') {
      newEl[key] = elParams[key];
    } 
    else {
      setOtherParam(newEl, key, elParams[key], elTypeNS);
    }
  }
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
export function setOtherParam(el, type, param, elTypeNS) {
  if (!param) return;
  
  if (!elTypeNS) {
    const xhtml = el.closest('foreignObject, annotation-xml, mtext');
    const svg = el.closest('svg');
    const math = el.closest('math');
    
    if (svg) {
      elTypeNS = 'svg';
    }
    else if (math) {
      elTypeNS = 'math';
    }
    else if (xhtml) {
      elTypeNS = 'xhtml';
    }
    else {
      elTypeNS = 'xhtml';
    }
  }
  
  
  if (getType(param) == 'object') {
    for (const key in param) {
      bindReactive(el, param[key], (value) => domWriter(el, {type, type2: key, elTypeNS, value}));
    }
  }
  else {
    bindReactive(el, param, (value) => domWriter(el, {type, type2: null, elTypeNS, value}));
  }
}


function valueResolver(param) {
  if (getType(param) == 'function' && param('key')) {
    return valueResolver(param());
  }
  else if (getType(param) == 'array') {
    let paramContent = '';
    
    for (const e of param) {
      paramContent += valueResolver(e);
    }
    return paramContent;
  } 
  else if (getType(param) == 'object') {
    const resolvedObj = {};
    
    for (const key in param) {
      resolvedObj[key] = valueResolver(param[key]);
    }
    return resolvedObj;
  }
  else {
    return param;
  }
}



function domWriter(el, {type, type2, elTypeNS, value}) {
  const attributeNS = {
    xml: 'http://www.w3.org/XML/1998/namespace',
    xmlns: 'http://www.w3.org/2000/xmlns/',
    xlink: 'http://www.w3.org/1999/xlink',
  };
  
  
  if (['style', 'dataset', 'classList'].includes(type)) {
    if (type == 'classList') {
      el[type][type2](value);
    } 
    else {
      if (type2) {
        el[type][type2] = value;
      }
      else if (getType(value) == 'object') {
        for (let key in value) {
          el[type][key] = value[key];
        }
      }
    }
  } 
  else {
    if (elTypeNS == 'xhtml') {
      el[type] = value;
    } 
    else {
      if (type == 'xmlns' || type.includes('xmlns:')) {
        el.setAttributeNS(attributeNS['xmlns'], type, value);
      }
      else if (type.includes('xml:')) {
        el.setAttributeNS(attributeNS['xml'], type, value);
      }
      else if (type.includes('xlink:')) {
        el.setAttributeNS(attributeNS['xlink'], type, value);
      } 
      else {
        el.setAttribute(type, value);
      }
    }
  }
}


function trackSubscriptions(key, updateFunction) {
  if (!data.allSubscribers[key]) {
    data.allSubscribers[key] = [];
  }
  
  if (!data.allSubscribers[key].includes(updateFunction)) {
    data.allSubscribers[key].push(updateFunction);
  }
}


function updateSubscriptions(key) {
  if (!data.allSubscribers[key]) return;
  
  for (let i = data.allSubscribers[key].length - 1; i >= 0; i--) {
    const e = data.allSubscribers[key][i];
    
    const result = e();
    if (!result) {
      data.allSubscribers[key].splice(i, 1);
    }
  }
}


function bindReactive(el, param, callback) {
  let isFirstCall = true;

  const updateFunction = () => {
    if (!isFirstCall && !el.isConnected) return false;
    isFirstCall = false;
    data.currentListener = updateFunction;
    
    const resolvedValue = valueResolver(param);
    
    data.currentListener = null;
    
    callback(resolvedValue);
    return true;
  };
  
  updateFunction();
}




//createEffect, аналог useEffect
export function createEffect(code, signals, clearCheck) {
  data.effectsQuantity ++;
  const id = data.effectsQuantity;
  
  data.allKeyClearEffect[id] = false;
  
  const clearFunction = code(removeEffect);
  if (!signals) return;
  
  for (const e of signals) {
    if (getType(e) != 'function' || !e('key')) continue;
    
    !data.allKeyEffect[e('key')] ? data.allKeyEffect[e('key')] = [] : null;
    data.allKeyEffect[e('key')].push(id);
  }
  
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
    
    for (const e of signals) {
      if (getType(e) == 'function' && e('key')) {
        data.allKeyEffect[e('key')] = data.allKeyEffect[e('key')].filter(effectId => effectId != id);
        if (data.allKeyEffect[e('key')].length == 0) {
          delete data.allKeyEffect[e('key')];
        }
      }
    }
  }
}

function updateEffect() {
  for (const e of idsEffects) {
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
    } 
    else {
      const check = clearCheck();
      
      if (!check) data.allKeyClearEffect[keyClear] = false;
      if (data.allKeyClearEffect[keyClear]) return;
      
      if (check) {
        data.allKeyClearEffect[keyClear] = true;
        clearFunction();
      } 
      else {
        data.allDataEffect[e].clearFunction = code(removeEffect);
      }
    }
  }
  idsEffects.clear();
}

function addIdsEffects(key) {
  if (!data.allKeyEffect[key]) return;
  
  for (const e of data.allKeyEffect[key]) {
    idsEffects.add(e);
  }
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
//561

