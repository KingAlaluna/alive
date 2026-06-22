# Alive
An ultra-lightweight, React-inspired library for reactive UI and data management, bridging the gap between React's declarative power and VanillaJS flexibility.
## Links
1. [alive](https://cdn.jsdelivr.net/gh/KingAlaluna/alive@v0.2.0/alive.js)
2. [alive.min](https://cdn.jsdelivr.net/gh/KingAlaluna/alive@v0.2.0/alive.min.js)
3. [alive.browser](https://cdn.jsdelivr.net/gh/KingAlaluna/alive@v0.2.0/alive.browser.js)
4. [alive.browser.min](https://cdn.jsdelivr.net/gh/KingAlaluna/alive@v0.2.0/alive.browser.min.js)
## Notes
 1. **Alive** will be much easier to understand for users who already know the true meaning of "reactivity", are familiar with frameworks/libraries like React, Preact, or SolidJS, and know how to build React applications in pure JavaScript **WITHOUT JSX**.
 2. **Key Differences Between Alive and React:**
   * **Absolute Freedom:** You can write code using a component-based architecture or choose not to use components at all. Reactivity works everywhere.
   * **High Flexibility:** Fewer rigid rules and constraints.
   * **Ultra-Lightweight:** Total bundle size is under 10KB.
   * **Single-File Core:** No heavy external dependencies or additional render layers like ReactDOM are required.
 3. **Important Architectural Roadmap:** The current engine operates exclusively on **mutation principles**. In upcoming releases, a configuration layer will be added, allowing users to toggle seamlessly between dynamic mutations and strict immutability. Future updates will focus on performance enhancements, brand-new features, and expanding existing core mechanics.
 4. **Environment Interoperability:** Alive completely supports integration both with modern standard ES Modules (type="module") and in classic legacy scripts without modules.
 5. A detailed analogy between Alive and React tools is mapped out below.
## Tool Overview (Cheat Sheet)
 * **Alive Object:** The monolithic global container from which all underlying tools can be extracted. When utilizing modern ES Modules, each tool can also be imported individually as a named export.
 * **createSignal()** — Alternative to useState() and useReducer().
 * **createEffect()** — Alternative to useEffect().
 * **setAppend()** — Declarative node builder (alternative to React.createElement(), createRoot(), and render()).
 * **setText()** — Targeted reactive text node updates.
 * **setStyle()** — Targeted reactive inline style mutations.
 * **setClassName()** — Targeted reactive string className replacement.
 * **setClassList()** — Targeted reactive classList array manipulations (add, remove, toggle, etc.).
 * **setDataset()** — Targeted reactive data-* attribute injection.
 * **setOtherParam()** — Universal tool to reactively control any other DOM element property (including styles, datasets, custom properties, etc.). While highly versatile, it is less compact than specialized tools.
## Tutorial & API Documentation
### 1. createSignal()
#### Initialization:
```javascript
const [getName, setName] = createSignal(value);

/*
CRITICAL NOTES:
- You can name your getter and setter whatever you want. However, to prevent mixing up regular variables with reactive state, it is highly recommended to prefix them with "get" (for reading data) and "set" (for mutating data).
- BOTH returned values are functions! Read this specification carefully.

- createSignal accepts up to 2 arguments: createSignal(reducer, value).
  1. If only 1 argument is passed, it defaults to the initial state value.
  2. If you want to use the custom Reducer function, you must specify both arguments (even if it is null or undefined). Otherwise, createSignal will take your Reducer function as the initial state value. None of the arguments is strictly required.

- The getter function (e.g., getName) accepts exactly 1 optional argument: a string path. This is used exclusively to deeply extract nested data structures.

- The setter function (e.g., setName) evaluates up to 4 parameters: path, key, team, and newValue. It supports two execution payload structures:
  1. For simple primitive updates, pass the new value directly: setName(newValue).
  2. To manipulate deep data structures, pass an object payload: setName({ path, team, key, newValue }). 
  Every parameter except newValue must evaluate to a string type when parsed by the engine. None of these parameters are mandatory.

Setter Payload Property Breakdown:
1. newValue: The new state value or insertion data.
2. path: The targeted string path required to mutate nested values.
3. team: The mutation modifier command ("=", "+=", "-=", "add", "clear", "remove", "set", etc.). 
         CRITICAL: Method-based commands must be written as a string WITHOUT execution parenthesis. "add" is correct; "add()" is a syntax error.
4. key: Required for commands that expect both a targeting key and a value payload simultaneously (e.g., when team is "set", key acts as the map property).
*/

```
#### Supported Data Types:
Absolutely any data type (primitives, plain objects, nested arrays, native Map, and native Set).
#### How to Use:
Signals are designed to be passed directly into the specialized tools provided by Alive. If you attempt to read a signal outside of an Alive utility context, you must execute getName() as a function, which breaks active DOM binding.
When working with deeply nested data structures, executing getName('path') returns an internal tracking function; therefore, to read its raw value outside of Alive utilities, you must invoke the returned function: getName('path')(). Inside Alive utilities, you do **not** need to manually invoke signals, regardless of the complexity of your data structure.
#### State Structure Examples:
**A) Basic Primitives:**
```javascript
const el = document.getElementById('el');

// Initialize primitive signal
const [getNumber, setNumber] = createSignal(67);

// Pass directly to an Alive tool (Automatic subscription layer binding)
setText(el, getNumber);

// Reading state outside Alive utilities (Requires manual invocation)
console.log(getNumber()); // 67

// Mutating value structures:
setNumber(15);
setNumber(getNumber() + 2);

```
**B) Deeply Nested Objects and Arrays:**
```javascript
const el = document.getElementById('el');

const [getPlayerData, setPlayerData] = createSignal({
  lv: 15,
  state: {
    xp: 90,
    mana: 50,
    items: [
      { name: 'food', quantity: 3 },
      { name: 'water', quantity: 5 }
    ]
  }
});

// Inside Alive utilities: Deep paths are joined with a dot (even array index offsets)
setText(el, getPlayerData('state.items.0.quantity'));

// Outside Alive utilities: Double execution layer invocation
console.log(getPlayerData('state.items.0.quantity')()); // 3

// Deep target structural mutation via the "+=" team action
setPlayerData({ path: 'state.items.0.quantity', team: '+=', newValue: 1 });

```
**C) Native Map() and Set() Collections:**
```javascript
const el = document.getElementById('el');

// Initialize native Map state
const [getEnemy, setEnemy] = createSignal(new Map([
  ['name', 'Guren'],
  ['xp', 100]
]));

// Inside Alive utilities: Prototype access queries are declared inline inside the string path
setText(el, getEnemy('get("name")'));

// Outside Alive utilities
console.log(getEnemy('get("name")')()); // 'Guren'

// Mutation via native Map methods using the 'set' team modifier
setEnemy({ team: 'set', key: 'name', newValue: 'Kornelia' });

// Native Set instances follow an identical structural pattern.

```
**D) Complex Multi-Tier Data Combinations:**
```javascript
const el = document.getElementById('el');

const [getRandomData, setRandomData] = createSignal({
  questions: [
    new Map([
      ['state', { legends: ['Soffy', 'Valeria'] }]
    ])
  ]
});

// Deep reactive traversal through Array -> Map -> Object -> Array
setText(el, getRandomData('questions.0.get("state").legends.1')); // Displays: Valeria
console.log(getRandomData('questions.0.get("state").legends.1')()); // Logs: Valeria

// Directly overwriting the nested string item via the "=" team action
setRandomData({ path: 'questions.0.get("state").legends.1', team: '=', newValue: 'Victor' });

```
**E) State Transitions Using a Reducer:**
```javascript
const mana = document.getElementById('mana');

function reducer(team) {
  if (team === 'a') {
    return 60;
  } else if (team === 'b') {
    return getMana() + 10;
  }
}

// Pass reducer as first parameter, initial state as the second
const [getMana, setMana] = createSignal(reducer, 70);

setText(mana, getMana);

mana.addEventListener('click', () => {
  setMana('b'); // Dispatches action to the reducer function
});

// This architectural workflow scales to any data type setup.

```
### 2. createEffect()
#### Declaration and Application Matrix:
```javascript
let randomValue = 0;
const [getRandomValue, setRandomValue] = createSignal(10);

createEffect((randomName) => {
  // Custom execution payload logic
  randomValue++;
  console.log(randomValue);
  
  // Permanently destroy the effect subscription
  if (randomValue === 3) randomName(); // Unsubscribes this specific effect permanently
  
  // Return cleanup/intercept routine
  return () => {
    // Executes as long as the condition evaluates to true, resuming the effect execution later
    setRandomValue(0);
    
    // The explicit destruction callback can be triggered from anywhere inside the lifecycle
    if (getRandomValue() < 10) randomName();
  };
}, [getRandomValue], () => { return randomValue === 2; });

/*
Parameters Breakdown:
1. Callback Function: Receives an unsubscription handle (randomName) as its primary parameter.
2. Dependencies Array: Supports ONLY createSignal tracking hooks. The block executes whenever an item in the dependency matrix mutates. If empty, the block executes exactly once during lifecycle mounting.
3. Condition Function (3rd argument): Evaluates a conditional return. The effect intercepts and handles state suspension rules based on its boolean value.
*/

```
### 3. setAppend()
#### Declarative DOM Node Building:
```html
<div id="wrap"></div>

```
```javascript
const wrap = document.getElementById('wrap');

setAppend((e /* You can name the element creator function anything, typically 'e' */) => [
  e('p', { className: 'hello' }, 'hello'),
  e('div', { dataset: { type: 'wrap' } }, [
    'Tom',
    e('strong', null, '100 mana')
  ])
]);

```
The blueprint engine parses the context above and renders the exact DOM layout below:
```html
<div id="wrap">
  <p class="hello">hello</p>
  <div data-type="wrap">
    Tom
    <strong>100 mana</strong>
  </div>
</div>

```
This architecture gives you immense architectural power: you can write clean functional components identical to React workflows, bind reactive parameters directly inside element attributes, and much more.
#### Static Attributes Binding:
```javascript
e('p', {
  className: 'random1',
  classList: {
    add: 'r2',
    remove: 'r3',
    toggle: 'r4'
    // Supports all native DOM classList prototype methods
  },
  style: {
    color: '#fff',
    background: '#000'
    // Supports all standard CSS inline style properties
  },
  dataset: {
    type: 't1',
    name: 't2',
    random: 't3'
    // Custom data-* attributes mapping layer
  },
  onclick: () => {
    console.log('hello');
  }
  // Binds any standard global DOM event handlers or properties. 
  // CRITICAL: Always use lowercase naming conventions (onclick, oninput, onkeydown) 
  // as the engine maps them directly to the native element properties.
}, 'hello')

```
#### Reactive property binding:
The engine automatically scans and detects reactive signals nested deep within `style`, `dataset`, `classList`, or any other attributes. You can easily mix static values and reactive hooks.

```javascript
const [getColor, setColor] = createSignal('#f00');
const [getWidth, setWidth] = createSignal('4rem');
const [getType, setType] = createSignal('main');

e('h1', {
  // The engine automatically detects functions/signals and subscribes to them
  style: {
    color: getColor,       // Reactive hook
    width: getWidth,       // Reactive hook
    background: '#0f0',    // Static
    border: ['1px solid', getColor], // Reactive hook
    borderRadius: '0.5rem' // Static
  },
  
  dataset: {
    type: getType          // Reactive hook
  },
  
  onclick: () => {
    setWidth('8rem');      // Modifies the signal, instantly updating the element width
  }
}, 'hello')
```
#### Inline Text Nodes Processing (Static vs. Reactive):
```javascript
const [getName, setName] = createSignal('Alex');
const text = 'hello';

e('p', 
  {
    onclick: () => { setName('Mickassa'); }
  }, 
  // Static string configurations (Non-reactive)
  'hello',
  'legend',
  `${text} legend`,
  text + 'legend',
  getName(),
  `${text} ${getName()}`,
  
  // Reactive nodes (Direct hook injection or wrapped array mapping profiles)
  getName,
  ['hello ', getName],
  [text + 'legend ', getName],
  [`${text} legend `, getName]
  // Any structural combination array layout is fully supported
)

```
### 4. setText()
#### Targeted DOM Text Nodes Linkage:
```javascript
const title = document.getElementById('title');
const [getTitle, setTitle] = createSignal('Hello');
const textTitle = 'Eren';

setText(title, getTitle);         // Reactive link: updates instantly on state change
setText(title, textTitle);        // Works, but establishes static fallback content (Non-reactive)
setText(title, [getTitle, textTitle]); // Works: only the embedded getTitle remains reactive
// setText(title, getTitle + textTitle); -> Throws error: cannot concatenate signals (they are functions)

```
### 5. setStyle()
#### Direct Target Style Property Mapping:
```javascript
const wrap = document.getElementById('wrap');

const [getWrapStyle, setWrapStyle] = createSignal({
  background: '#000',
  width: '80%',
  height: '4rem'
});
const [getColor, setColor] = createSignal('#fff');

setStyle(wrap, {
  background: getWrapStyle('background'),
  width: getWrapStyle('width'),
  height: getWrapStyle('height'),
  color: getColor,
  
  border: '1px solid #fff' // Static fallback styles can be declared directly
});

```
### 6. setClassName()
#### Full Target className Core Overwrites:
```javascript
const card = document.getElementById('card');
const [getClassCard, setClassCard] = createSignal('anime-card');

setClassName(card, getClassCard);

```
### 7. setClassList()
#### Micro-Managed Token Mutations:
```javascript
const card = document.getElementById('card');
const [getClassCard, setClassCard] = createSignal('anime-card');

setClassList(card, {
  add: getClassCard
  // Accepts all native DOMTokenList prototype modification keywords
});

```
### 8. setDataset()
#### Dedicated Component data-* Properties Alignment:
```javascript
const card = document.getElementById('card');
const [getTypeCard, setTypeCard] = createSignal('anime-card');

setDataset(card, {
  type: getTypeCard
});

```
### 9. setOtherParam()
#### Universal Fallback Configuration Layer:
```javascript
// Difference: setOtherParam target scopes any available browser property using a string name argument. It is less compact than targeted utilities, but provides complete parameter configuration freedom.
const card = document.getElementById('card');
const [getTypeCard, setTypeCard] = createSignal('main');
const [getClassCard, setClassCard] = createSignal('anime-card');

// Mapping dataset properties manually
setOtherParam(card, 'dataset', {
  type: getTypeCard
});

// Mapping classList tokens manually
setOtherParam(card, 'classList', {
  add: getClassCard
});

// Mapping raw className properties manually
setOtherParam(card, 'className', getClassCard);

// Supports all standard DOM key parameter definitions and custom attributes

```
