const BLOCK_TAG_NAMES = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'DIV',
  'DL',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'TABLE',
  'TR',
  'TD',
  'TH',
  'UL',
]);

export function convertRichHtmlToPlainText(html: string): string {
  if (!html.trim()) {
    return '';
  }

  const documentFragment = new DOMParser().parseFromString(html, 'text/html');
  const serializedText = serializeContainer(documentFragment.body, 0);
  return collapseExcessiveBreaks(serializedText).trim();
}

function serializeContainer(container: HTMLElement, level: number): string {
  const segments: string[] = [];
  let inlineBuffer = '';

  const flushInlineBuffer = (): void => {
    const normalizedInlineText = normalizeInlineBuffer(inlineBuffer);

    if (normalizedInlineText) {
      segments.push(normalizedInlineText);
    }

    inlineBuffer = '';
  };

  for (const childNode of Array.from(container.childNodes)) {
    if (childNode.nodeType === Node.TEXT_NODE) {
      inlineBuffer += childNode.textContent ?? '';
      continue;
    }

    if (!(childNode instanceof HTMLElement)) {
      continue;
    }

    const tagName = childNode.tagName.toUpperCase();

    if (tagName === 'BR') {
      inlineBuffer += '\n';
      continue;
    }

    if (tagName === 'UL' || tagName === 'OL') {
      flushInlineBuffer();
      const serializedList = serializeList(childNode, level);

      if (serializedList) {
        segments.push(serializedList);
      }
      continue;
    }

    if (tagName === 'PRE') {
      flushInlineBuffer();
      const preformattedText = normalizePreformattedText(childNode.textContent ?? '');

      if (preformattedText) {
        segments.push(preformattedText);
      }
      continue;
    }

    if (isBlockElement(childNode)) {
      flushInlineBuffer();
      const serializedBlock = serializeContainer(childNode, level);

      if (serializedBlock) {
        segments.push(serializedBlock);
      }
      continue;
    }

    inlineBuffer += serializeInlineNode(childNode);
  }

  flushInlineBuffer();

  return segments.filter(Boolean).join('\n\n');
}

function serializeList(listElement: HTMLElement, level: number): string {
  const isOrderedList = listElement.tagName.toUpperCase() === 'OL';
  const listItems = Array.from(listElement.children)
    .filter((child): child is HTMLElement => child instanceof HTMLElement && child.tagName.toUpperCase() === 'LI')
    .map((listItem, index) => serializeListItem(listItem, level, isOrderedList, index));

  return listItems.filter(Boolean).join('\n');
}

function serializeListItem(listItem: HTMLElement, level: number, isOrderedList: boolean, index: number): string {
  const marker = isOrderedList ? `${index + 1}.` : '-';
  const indentation = '  '.repeat(level);
  let inlineBuffer = '';
  const nestedLists: string[] = [];

  for (const childNode of Array.from(listItem.childNodes)) {
    if (childNode.nodeType === Node.TEXT_NODE) {
      inlineBuffer += childNode.textContent ?? '';
      continue;
    }

    if (!(childNode instanceof HTMLElement)) {
      continue;
    }

    const tagName = childNode.tagName.toUpperCase();

    if (tagName === 'BR') {
      inlineBuffer += '\n';
      continue;
    }

    if (tagName === 'UL' || tagName === 'OL') {
      const serializedNestedList = serializeList(childNode, level + 1);

      if (serializedNestedList) {
        nestedLists.push(serializedNestedList);
      }
      continue;
    }

    if (isBlockElement(childNode)) {
      const serializedBlock = serializeContainer(childNode, level + 1);

      if (serializedBlock) {
        inlineBuffer += `${inlineBuffer ? '\n' : ''}${serializedBlock}`;
      }
      continue;
    }

    inlineBuffer += serializeInlineNode(childNode);
  }

  const normalizedItemText = indentWrappedLines(normalizeInlineBuffer(inlineBuffer), `${indentation}  `);
  const firstLine = normalizedItemText
    ? `${indentation}${marker} ${normalizedItemText}`
    : `${indentation}${marker}`;

  return [firstLine, ...nestedLists].filter(Boolean).join('\n');
}

function serializeInlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (!(node instanceof HTMLElement)) {
    return '';
  }

  if (node.tagName.toUpperCase() === 'BR') {
    return '\n';
  }

  if (isBlockElement(node)) {
    return serializeContainer(node, 0);
  }

  return Array.from(node.childNodes).map((childNode) => serializeInlineNode(childNode)).join('');
}

function normalizeInlineBuffer(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter((line, index, lines) => line.length > 0 || hasNonEmptyNeighbour(lines, index))
    .join('\n')
    .trim();
}

function normalizePreformattedText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function indentWrappedLines(value: string, indentation: string): string {
  const lines = value.split('\n');

  if (lines.length <= 1) {
    return value;
  }

  return lines.map((line, index) => (index === 0 ? line : `${indentation}${line}`)).join('\n');
}

function collapseExcessiveBreaks(value: string): string {
  return value.replace(/\n{3,}/g, '\n\n');
}

function hasNonEmptyNeighbour(lines: string[], index: number): boolean {
  return Boolean(lines[index - 1]?.trim() || lines[index + 1]?.trim());
}

function isBlockElement(element: HTMLElement): boolean {
  return BLOCK_TAG_NAMES.has(element.tagName.toUpperCase());
}
