import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { NEXFLOW_APP_URL } from '../../../app.constants';
import { raioXExtrato } from '../../../content';
import { COMPANY, COMPANY_CNPJ, FOUNDER, RAIO_X_SOURCE_URL } from '../../../content/pt-BR/site';
import { CtaSectionComponent } from '../../../shared/components/cta-section/cta-section.component';
import { ExplainableNumberComponent } from '../../../shared/components/explainable-number/explainable-number.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PrivacyPanelComponent } from '../../../shared/components/privacy-panel/privacy-panel.component';
import { TrackService } from '../../../shared/analytics/track.service';
import { formatCents, parseMoneyToCents } from '../../../tools/core/money';
import { parseCsvStatement } from '../../../tools/core/statement/csv.parser';
import { parseOfxStatement } from '../../../tools/core/statement/ofx.parser';
import type { ParsedStatement } from '../../../tools/core/statement/types';
import { monthLabel } from '../../../tools/raio-x/months';
import { MARKET_RATES, compareRate, formatPercent, formatReference, parsePercent, type MarketRateId } from '../../../tools/raio-x/market-rates';
import { buildReport } from '../../../tools/raio-x/report';
import { sampleCsv } from '../../../tools/raio-x/sample';
import { renderShareImage } from '../../../tools/raio-x/share-image';
import { EMPTY_MANUAL, type ManualInput } from '../../../tools/raio-x/types';

const TOOL = 'raio-x-extrato';
const MAX_BYTES = 5 * 1024 * 1024;

/** UTM é só um rótulo de origem (sem dado pessoal): permite saber, do lado do NexFlow, de onde veio o cadastro. */
const REGISTER_URL = `${NEXFLOW_APP_URL}/register?utm_source=raio-x&utm_medium=ferramenta`;

/** Arquivos de banco costumam vir em UTF-8 ou Windows-1252. */
function decode(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** Conteúdo lido, esperando a pessoa conferir a prévia e clicar em "Processar". */
interface PendingInput {
  statement: ParsedStatement;
  origin: 'arquivo' | 'colado';
}

const brDate = (iso: string): string => iso.split('-').reverse().join('/');

@Component({
  selector: 'app-raio-x-page',
  standalone: true,
  imports: [PageHeaderComponent, ExplainableNumberComponent, PrivacyPanelComponent, CtaSectionComponent, RouterLink],
  templateUrl: './raio-x-page.html',
  styleUrl: './raio-x-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaioXPage {
  readonly c = raioXExtrato;
  readonly registerUrl = REGISTER_URL;
  readonly monthLabel = monthLabel;
  readonly formatCents = formatCents;
  readonly market = MARKET_RATES;
  readonly formatPercent = formatPercent;
  readonly marketRef = formatReference(MARKET_RATES.referencia);
  readonly marketDate = MARKET_RATES.conferidoEm.split('-').reverse().join('/');
  readonly marketSeries = MARKET_RATES.itens.map((i) => i.serie).join(', ');
  private readonly tracker = inject(TrackService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly resultHeading = viewChild<ElementRef<HTMLElement>>('resultHeading');
  private readonly exampleButton = viewChild<ElementRef<HTMLButtonElement>>('exampleButton');
  private readonly root = viewChild<ElementRef<HTMLElement>>('root');

  /** Endereço do código aberto e dados de identificação: vazios até o fundador decidir (D5, D6). */
  readonly sourceUrl = RAIO_X_SOURCE_URL;
  readonly cnpj = COMPANY_CNPJ;
  readonly company = COMPANY;
  readonly founder = FOUNDER;

  readonly statement = signal<ParsedStatement | null>(null);
  readonly manual = signal<ManualInput>(EMPTY_MANUAL);
  readonly confirmed = signal<string[]>([]);
  readonly thresholdText = signal('');
  readonly sampleShown = signal(false);
  readonly fileError = signal('');
  readonly manualError = signal('');
  readonly copied = signal(false);
  readonly pending = signal<PendingInput | null>(null);
  readonly rateKind = signal<MarketRateId>('rotativo');
  readonly rateText = signal('');

  /** Comparação da taxa digitada com a média do BCB da modalidade escolhida. */
  readonly rateComparison = computed(() => {
    if (!this.rateText().trim()) return null;
    const user = parsePercent(this.rateText());
    if (user === null) return { invalid: true as const };
    const m = MARKET_RATES.itens.find((i) => i.id === this.rateKind())!;
    const c = compareRate(user, m.monthlyPercent);
    return { invalid: false as const, user, market: m, ...c, value: `${Math.abs(c.relativePercent).toFixed(1).replace('.', ',')}%` };
  });
  readonly pasteText = signal('');
  private started = false;
  private completed = false;

  constructor() {
    afterNextRender(() => this.enableOffline());
  }

  /**
   * Deixa a ferramenta abrir sem internet (RX-02). Só em produção (https): em desenvolvimento e nos
   * testes o service worker atrapalharia. Falhar aqui não afeta o uso da ferramenta.
   */
  private enableOffline(): void {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    navigator.serviceWorker
      .register('/raio-x-sw.js', { scope: '/ferramentas/raio-x-do-extrato' })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = [location.pathname, ...performance.getEntriesByType('resource').map((r) => r.name)];
        reg.active?.postMessage({ type: 'guardar', urls });
      })
      .catch(() => undefined);
  }

  readonly hasInput = computed(() => this.statement() !== null || this.manual().installments.length + this.manual().subscriptions.length > 0);

  /** O que será lido, para a pessoa conferir antes de processar (RX-03). */
  readonly preview = computed(() => {
    const p = this.pending();
    if (!p) return null;
    const dates = p.statement.lines.map((l) => l.date).sort();
    return {
      count: p.statement.lines.length,
      issues: p.statement.issues.length,
      from: dates.length ? brDate(dates[0]) : '',
      to: dates.length ? brDate(dates[dates.length - 1]) : '',
    };
  });

  readonly report = computed(() => {
    if (!this.hasInput()) return null;
    return buildReport(this.statement(), this.manual(), {
      today: new Date().toISOString().slice(0, 10),
      thresholdCents: parseMoneyToCents(this.thresholdText()),
      confirmedKeys: this.confirmed(),
    });
  });

  /** Aviso para leitor de tela: só muda quando o resultado aparece (não a cada tecla no limiar). */
  readonly statusMessage = computed(() => (this.report() ? this.c.results.resultReady : ''));

  readonly fill = (template: string, values: Record<string, string | number>): string =>
    template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

  /** Leva a pessoa ao resultado: ele nasce abaixo do formulário e, no celular, fora da tela. */
  private focusResult(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const el = this.resultHeading()?.nativeElement;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: 'start' });
    }, 0);
  }

  private begin(): void {
    if (!this.started) {
      this.started = true;
      this.tracker.track('tool_start', { tool: TOOL });
    }
  }

  private manualTracked = false;

  /** "Concluiu o modo manual" = a primeira vez que o preenchimento à mão já produz resultado. */
  private trackManualDone(): void {
    if (this.manualTracked || !this.report()) return;
    this.manualTracked = true;
    this.tracker.track('rx_manual_concluido', {});
  }

  /** A pessoa abriu a opção de arquivo (só o abrir; nada do conteúdo). */
  onFileBoxToggle(event: Event): void {
    if ((event.target as HTMLDetailsElement).open) this.tracker.track('rx_arquivo_expandido', {});
  }

  private finish(): void {
    if (!this.completed && this.report()) {
      this.completed = true;
      this.tracker.track('tool_complete', { tool: TOOL });
    }
  }

  /** Lê o texto localmente e só prepara a prévia: nada é calculado até a pessoa clicar em "Processar". */
  private parseText(text: string, name = ''): ParsedStatement {
    const isOfx = /\.ofx$/i.test(name) || /OFXHEADER|<OFX[\s>]/i.test(text.slice(0, 2000));
    return isOfx ? parseOfxStatement(text) : parseCsvStatement(text);
  }

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileError.set('');
    if (file.size > MAX_BYTES) {
      this.pending.set(null);
      this.fileError.set(this.c.upload.tooBig);
      return;
    }
    try {
      const text = decode(await file.arrayBuffer());
      this.pasteText.set('');
      this.pending.set({ statement: this.parseText(text, file.name), origin: 'arquivo' });
    } catch {
      this.pending.set(null);
      this.fileError.set(this.c.upload.unreadable);
    } finally {
      input.value = ''; // permite escolher o mesmo arquivo de novo
    }
  }

  /** Linhas coladas: a pessoa escolhe o que mostrar, sem enviar o arquivo inteiro. */
  onPaste(text: string): void {
    this.fileError.set('');
    this.pasteText.set(text);
    if (!text.trim()) {
      this.pending.set(null);
      return;
    }
    if (text.length > MAX_BYTES) {
      this.pending.set(null);
      this.fileError.set(this.c.upload.tooBig);
      return;
    }
    try {
      this.pending.set({ statement: this.parseText(text), origin: 'colado' });
    } catch {
      this.pending.set(null);
      this.fileError.set(this.c.upload.unreadable);
    }
  }

  process(): void {
    const p = this.pending();
    if (!p || p.statement.lines.length === 0) return;
    this.tracker.track(p.origin === 'colado' ? 'rx_colar_processado' : 'rx_arquivo_processado', {});
    this.begin();
    this.statement.set(p.statement);
    this.sampleShown.set(false);
    this.confirmed.set([]);
    this.pending.set(null);
    this.pasteText.set('');
    this.finish();
    this.focusResult();
  }

  cancelPending(): void {
    this.pending.set(null);
    this.pasteText.set('');
    this.fileError.set('');
  }

  loadExample(): void {
    this.tracker.track('rx_exemplo_aberto', {});
    this.begin();
    this.statement.set(parseCsvStatement(sampleCsv()));
    this.sampleShown.set(true);
    this.confirmed.set([]);
    this.fileError.set('');
    this.finish();
    this.focusResult();
  }

  clear(): void {
    this.statement.set(null);
    this.manual.set(EMPTY_MANUAL);
    this.confirmed.set([]);
    this.sampleShown.set(false);
    this.thresholdText.set('');
    this.fileError.set('');
    this.manualError.set('');
    this.copied.set(false);
    this.pending.set(null);
    this.pasteText.set('');
    this.rateText.set('');
    this.started = false;
    this.completed = false;
    this.manualTracked = false;
    if (this.isBrowser) setTimeout(() => this.exampleButton()?.nativeElement.focus(), 0);
  }

  onInstallmentSubmit(event: Event, label: string, value: string, remaining: string): void {
    event.preventDefault();
    if (this.addInstallment(label, value, remaining)) (event.target as HTMLFormElement).reset();
  }

  onSubscriptionSubmit(event: Event, label: string, value: string): void {
    event.preventDefault();
    if (this.addSubscription(label, value)) (event.target as HTMLFormElement).reset();
  }

  addInstallment(label: string, value: string, remaining: string): boolean {
    const cents = parseMoneyToCents(value);
    const n = Number(remaining);
    if (!label.trim() || cents === null || cents <= 0 || !Number.isInteger(n) || n < 1 || n > 60) {
      this.manualError.set(this.c.manual.invalid);
      return false;
    }
    this.manualError.set('');
    this.begin();
    this.manual.update((m) => ({ ...m, installments: [...m.installments, { label: label.trim(), installmentCents: cents, remaining: n }] }));
    this.finish();
    this.trackManualDone();
    return true;
  }

  addSubscription(label: string, value: string): boolean {
    const cents = parseMoneyToCents(value);
    if (!label.trim() || cents === null || cents <= 0) {
      this.manualError.set(this.c.manual.invalid);
      return false;
    }
    this.manualError.set('');
    this.begin();
    this.manual.update((m) => ({ ...m, subscriptions: [...m.subscriptions, { label: label.trim(), monthlyCents: cents }] }));
    this.finish();
    this.trackManualDone();
    return true;
  }

  removeManual(kind: 'installments' | 'subscriptions', index: number): void {
    this.manual.update((m) => ({ ...m, [kind]: m[kind].filter((_, i) => i !== index) }) as ManualInput);
  }

  confirm(key: string): void {
    this.confirmed.update((list) => [...list, key]);
  }

  onThreshold(value: string): void {
    this.thresholdText.set(value);
  }

  async copy(): Promise<void> {
    const text = this.report()?.text;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2500);
      this.tracker.track('share', { tool: TOOL, channel: 'copiar' });
    } catch {
      this.copied.set(false);
    }
  }

  async shareImage(): Promise<void> {
    const cents = this.report()?.totals.recurringAnnual.cents ?? 0;
    try {
      const url = URL.createObjectURL(await renderShareImage(cents));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meu-raio-x.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.tracker.track('share', { tool: TOOL, channel: 'imagem' });
      this.tracker.track('rx_imagem_gerada', {});
    } catch {
      /* sem valor ou sem canvas: o botão só aparece quando há valor */
    }
  }

  /** Modo apresentação (oficinas): o exemplo em tela cheia, legível em projetor. */
  async present(): Promise<void> {
    const el = this.root()?.nativeElement;
    if (!el?.requestFullscreen) return;
    try {
      await el.requestFullscreen();
    } catch {
      /* o navegador pode recusar (iframe, permissão): a página segue normal */
    }
  }

  exitPresent(): void {
    if (document.fullscreenElement) void document.exitFullscreen();
  }

  print(): void {
    window.print();
  }

  /** Clique no próximo passo (sem dado pessoal). */
  onCtaClick(event: Event): void {
    if ((event.target as HTMLElement).closest('a')) {
      this.tracker.track('next_step_click', { tool: TOOL, target: 'nexflow' });
      this.tracker.track('rx_clique_nexflow', {});
    }
  }

  barWidth(cents: number, max: number): number {
    return max > 0 ? Math.max(2, Math.round((cents / max) * 100)) : 0;
  }
}
