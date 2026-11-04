(() => {
  const exact = new Map(Object.entries({
    "New":"Создать","Open":"Открыть","Save project":"Сохранить проект","Undo":"Отменить","Redo":"Повторить",
    "Export PNG":"Экспорт PNG","Sprite sheet":"Лист спрайтов","Export GIF":"Экспорт GIF","Export all clips":"Экспорт всех клипов","Game JSON":"Данные для игры (JSON)",
    "Ready":"Готово","Idle":"Покой","Walk":"Шаг","Run":"Бег","Jump":"Прыжок","Attack":"Атака","Death":"Смерть","Pencil":"Карандаш","Eraser":"Ластик","Fill":"Заливка","Picker":"Пипетка","Line":"Линия","Rect":"Прямоугольник","Ellipse":"Эллипс","Select":"Выделение","Move":"Перемещение",
    "Pencil tool":"Инструмент «Карандаш»","Eraser tool":"Инструмент «Ластик»","Bucket tool":"Инструмент «Заливка»","Eyedropper tool":"Инструмент «Пипетка»","Line tool":"Инструмент «Линия»","Rect tool":"Инструмент «Прямоугольник»","Ellipse tool":"Инструмент «Эллипс»","Select tool":"Инструмент «Выделение»","Move tool":"Инструмент «Перемещение»",
    "Fit":"По размеру","Grid":"Сетка","Onion":"Просветка","Reference":"Референс","Checker":"Шахматный фон","Dark":"Тёмный","Light":"Светлый","BG":"Фон",
    "COLOR":"ЦВЕТ","PRIMARY":"ОСНОВНОЙ","Foreground color":"Основной цвет","Add color":"Добавить цвет","BRUSH":"КИСТЬ","Size":"Размер","Square":"Квадратная","Round":"Круглая","Mirror horizontally":"Отразить по горизонтали","Mirror vertically":"Отразить по вертикали",
    "LAYERS":"СЛОИ","Add shared layer":"Добавить слой","Add character part layer":"Добавить слой части персонажа","Delete shared layer":"Удалить слой","Opacity":"Непрозрачность","Shared structure · frame-specific pixels":"Общая структура · отдельные пиксели для каждого кадра",
    "SELECTION":"ВЫДЕЛЕНИЕ","No selection":"Нет выделения","Copy":"Копировать","Cut":"Вырезать","Paste":"Вставить","Deselect":"Снять выделение","Flip H":"Отразить ↔","Flip V":"Отразить ↕","Rotate 90°":"Повернуть на 90°",
    "GIF EXPORT":"ЭКСПОРТ GIF","Scale":"Масштаб","Quality":"Качество","High":"Высокое","Balanced":"Сбалансированное","Smaller file":"Меньший файл","GIF uses current frame timing and visible layers.":"GIF использует длительность текущих кадров и видимые слои.",
    "ANIMATION DATA":"ДАННЫЕ АНИМАЦИИ","PER FRAME":"ДЛЯ КАЖДОГО КАДРА","Event":"Событие","Apply pivot to whole clip":"Применить опорную точку ко всему клипу",
    "PALETTE TOOLS":"ИНСТРУМЕНТЫ ПАЛИТРЫ","Replace":"Заменить","With":"На","Replace color in whole project":"Заменить цвет во всём проекте",
    "REFERENCE":"РЕФЕРЕНС","Motion reference":"Референс движения","Load a pose or movement reference. It stays outside exported sprite pixels.":"Загрузите референс позы или движения. Он не попадёт в экспортируемые пиксели спрайта.",
    "ANIMATION CHECK":"ПРОВЕРКА АНИМАЦИИ","Check current clip":"Проверить текущий клип","No analysis yet":"Проверка ещё не запускалась",
    "DOCUMENT":"ДОКУМЕНТ","Width":"Ширина","Height":"Высота","Resize canvas":"Изменить размер холста",
    "ЛЕНТА АНИМАЦИИ":"ЛЕНТА АНИМАЦИИ","КЛИП":"КЛИП","FPS":"КАДР/СЕК","Play":"Воспроизвести","Stop":"Остановить","Add frame":"Добавить кадр","Empty frame":"Пустой кадр","Duplicate frame":"Дублировать кадр","Delete":"Удалить",
    "Дополнительные настройки и операции с кадрами":"Дополнительные настройки и операции с кадрами","ДВИЖОК":"ДВИЖОК","Generic JSON":"Универсальный JSON","Зациклить":"Зациклить","Длительность, мс":"Длительность, мс","Применить FPS":"Применить частоту кадров","Луковая кожа":"Просветка кадров","Прозрачность":"Прозрачность","Дублировать выбранные":"Дублировать выбранные","Удалить выбранные":"Удалить выбранные","Задать длительность":"Задать длительность",
    "БЫСТРЫЕ КОМАНДЫ":"БЫСТРЫЕ КОМАНДЫ","Close":"Закрыть","Run this app with npm start to enable project dialogs.":"Запустите программу командой npm start, чтобы включить диалоги открытия и сохранения проектов.",
    "Saved":"Сохранено","Opened":"Открыто","Auto-saved":"Автосохранение выполнено","Auto-save unavailable":"Автосохранение недоступно","Undo":"Отменено","Redo":"Повторено",
    "FPS applied to current clip":"Частота кадров применена к текущему клипу","All clips exported":"Все клипы экспортированы","GIF exported":"GIF экспортирован","GIF export stopped":"Экспорт GIF остановлен","GIF encoder is missing. Run npm install and restart the app.":"Не найден кодировщик GIF. Выполните npm install и перезапустите программу.",
    "Rendering…":"Обработка…","No selection":"Нет выделения","All":"Все инструменты","Untitled sprite":"Новый спрайт","Untitled":"Без названия",
    "LAYERS":"СЛОИ","TOOLS":"ИНСТРУМЕНТЫ","Wheel · Space+Drag":"Колесо мыши · Пробел + перетаскивание","RGBA · Nearest neighbour":"RGBA · Интерполяция по ближайшему соседу"
  }));
  [
    ["↶ Undo","↶ Отменить"],["↷ Redo","↷ Повторить"],
    ["Fit canvas (F)","Подогнать холст (F)"],["Pencil (B)","Карандаш (B)"],["Eraser (E)","Ластик (E)"],["Fill (G)","Заливка (G)"],["Eyedropper (I)","Пипетка (I)"],["Line (L)","Линия (L)"],["Rectangle (U)","Прямоугольник (U)"],["Ellipse (O)","Эллипс (O)"],["Rectangular selection (M)","Прямоугольное выделение (M)"],["Move selection (V)","Перемещение выделения (V)"],
    ["Toggle visibility","Переключить видимость"],["Unlock layer","Разблокировать слой"],["Lock layer","Заблокировать слой"],["Shared layer name","Название слоя"],
    ["Square brush","Квадратная кисть"],["Round brush","Круглая кисть"],["Apply FPS to all frames","Применить частоту кадров ко всем кадрам"],
    ["Pivot X","Опорная точка X"],["Pivot Y","Опорная точка Y"],["Generic JSON","Универсальный JSON"],
    ["Save PixelForge project","Сохранить проект PixelForge"],["PixelForge Project","Проект PixelForge"],["PNG Image","Изображение PNG"],
    ["No analysis yet","Проверка ещё не запускалась"],["Selected 1 frame","Выбран 1 кадр"],["Untitled sprite","Новый спрайт"]
  ].forEach(([from,to]) => exact.set(from,to));
  const patterns = [
    [/^Frame (\d+) · (\d+)ms$/, "Кадр $1 · $2 мс"],
    [/^Created (.+) clip$/, "Создан клип «$1»"],
    [/^Replaced (\d+) pixels$/, "Заменено пикселей: $1"],
    [/^Added (\d+) frames?$/, "Добавлено кадров: $1"],
    [/^All clips exported$/, "Все клипы экспортированы"],
    [/^FPS applied to current clip$/, "Частота кадров применена к текущему клипу"],
    [/^Layer copied from frame (\d+)$/, "Слой скопирован из кадра $1"],
    [/^(.+) frames? selected$/, "Выбрано кадров: $1"]
  ];
  const translate = value => {
    if (exact.has(value)) return exact.get(value);
    for (const [pattern, replacement] of patterns) if (pattern.test(value)) return value.replace(pattern, replacement);
    return value;
  };
  const attrs = ["title","aria-label","placeholder","alt"];
  const walk = root => {
    if (root.nodeType === Node.TEXT_NODE) {
      const next = translate(root.nodeValue.trim());
      if (next !== root.nodeValue.trim()) root.nodeValue = root.nodeValue.replace(root.nodeValue.trim(), next);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of attrs) if (root.hasAttribute(attr)) {
      const value = root.getAttribute(attr), next = translate(value);
      if (next !== value) root.setAttribute(attr, next);
    }
    if (root.tagName === "OPTION") {
      const next = translate(root.textContent.trim());
      if (next !== root.textContent.trim()) root.textContent = next;
    }
    for (const child of root.childNodes) walk(child);
  };
  const apply = () => walk(document.body);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, {once:true}); else apply();
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "characterData") walk(record.target);
      else for (const node of record.addedNodes) walk(node);
      if (record.type === "attributes") walk(record.target);
    }
  }).observe(document.documentElement, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs});
})();