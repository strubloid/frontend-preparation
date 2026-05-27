import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { convertRichHtmlToPlainText } from '../utils/rich-text-paste.utils';

@Directive({
  selector: 'textarea[appPreserveRichTextPaste]',
})
export class PreserveRichTextPasteDirective {
  private readonly elementRef = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const clipboardData = event.clipboardData;
    const richHtml = clipboardData?.getData('text/html')?.trim();

    if (!clipboardData || !richHtml) {
      return;
    }

    const formattedText = convertRichHtmlToPlainText(richHtml);

    if (!formattedText) {
      return;
    }

    event.preventDefault();

    const textarea = this.elementRef.nativeElement;
    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const nextValue = `${textarea.value.slice(0, selectionStart)}${formattedText}${textarea.value.slice(selectionEnd)}`;
    const nextCaretPosition = selectionStart + formattedText.length;

    textarea.value = nextValue;
    textarea.setSelectionRange(nextCaretPosition, nextCaretPosition);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
