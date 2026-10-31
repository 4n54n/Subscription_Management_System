import {
  ConnectorMode,
  DefaultTheme,
  type LineWidth,
  StrokeStyle,
} from '@blocksuite/affine-model';
import {
  EditPropsStore,
  FeatureFlagService,
  ThemeProvider,
} from '@blocksuite/affine-shared/services';
import type { ColorEvent } from '@blocksuite/affine-shared/utils';
import { EdgelessToolbarToolMixin } from '@blocksuite/affine-widget-edgeless-toolbar';
import { SignalWatcher } from '@blocksuite/global/lit';
import {
  ConnectorCIcon,
  ConnectorEIcon,
  ConnectorLIcon,
} from '@blocksuite/icons/lit';
import type { GfxToolsFullOptionValue } from '@blocksuite/std/gfx';
import { computed } from '@preact/signals-core';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

function ConnectorModeButtonGroup(
  mode: ConnectorMode,
  setConnectorMode: (props: Record<string, unknown>) => void
) {
  /**
   * There is little hacky on rendering tooltip.
   * We don't want either tooltip overlap the top button or tooltip on left.
   * So we put the lower button's tooltip as the first element of the button group container
   */
  return html`
    <div class="connector-mode-button-group">
      <edgeless-tool-icon-button
        .active=${mode === ConnectorMode.Curve}
        .activeMode=${'background'}
        .tooltip=${'Curve'}
        .iconSize=${'20px'}
        @click=${() => setConnectorMode({ mode: ConnectorMode.Curve })}
      >
        ${ConnectorCIcon()}
      </edgeless-tool-icon-button>
      <edgeless-tool-icon-button
        .active=${mode === ConnectorMode.Orthogonal}
        .activeMode=${'background'}
        .tooltip=${'Elbowed'}
        .iconSize=${'20px'}
        @click=${() => setConnectorMode({ mode: ConnectorMode.Orthogonal })}
      >
        ${ConnectorEIcon()}
      </edgeless-tool-icon-button>
      <edgeless-tool-icon-button
        .active=${mode === ConnectorMode.Straight}
        .activeMode=${'background'}
        .tooltip=${'Straight'}
        .iconSize=${'20px'}
        @click=${() => setConnectorMode({ mode: ConnectorMode.Straight })}
      >
        ${ConnectorLIcon()}
      </edgeless-tool-icon-button>
    </div>
  `;
}

export class EdgelessConnectorMenu extends EdgelessToolbarToolMixin(
  SignalWatcher(LitElement)
) {
  static override styles = css`
    :host {
      position: absolute;
      display: flex;
      z-index: -1;
    }

    .connector-submenu-content {
      display: flex;
      height: 24px;
      align-items: center;
      justify-content: center;
    }

    .connector-mode-button-group {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 14px;
    }

    .connector-mode-button-group > edgeless-tool-icon-button svg {
      fill: var(--affine-icon-color);
    }

    .submenu-divider {
      width: 1px;
      height: 24px;
      margin: 0 16px;
      background-color: var(--affine-border-color);
      display: inline-block;
    }

    @keyframes flow-dash-clockwise {
      to {
        stroke-dashoffset: -20;
      }
    }

    @keyframes flow-dash-counterclockwise {
      to {
        stroke-dashoffset: 20;
      }
    }

    .flow-svg-icon {
      width: 16px;
      height: 16px;
      display: inline-block;
      vertical-align: middle;
    }

    .flow-circle-bg {
      fill: none;
      stroke: var(--affine-border-color);
      stroke-width: 1.5;
      transition: stroke 0.2s ease;
    }

    edgeless-tool-icon-button[active] .flow-circle-bg {
      stroke: rgba(0, 162, 255, 0.2);
    }

    .flow-circle-active {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      opacity: 0.8;
      transition: all 0.2s ease;
    }

    /* Electric Flow Animation */
    .flow-circle-active.electric {
      stroke: #00e5ff;
      stroke-dasharray: 6 4;
      animation: flow-dash-clockwise 1.2s linear infinite;
      filter: drop-shadow(0 0 2px rgba(0, 229, 255, 0.6));
    }

    /* Coir Rope Flow Animation */
    .flow-circle-active.coir-strand-1 {
      stroke: #00e5ff;
      stroke-width: 1.5;
      stroke-dasharray: 5 4;
      animation: flow-dash-clockwise 1.5s linear infinite;
      filter: drop-shadow(0 0 2px rgba(0, 229, 255, 0.5));
    }

    .flow-circle-active.coir-strand-2 {
      stroke: #0088ff;
      stroke-width: 1.5;
      stroke-dasharray: 4 3;
      animation: flow-dash-counterclockwise 1.5s linear infinite;
      filter: drop-shadow(0 0 2px rgba(0, 136, 255, 0.5));
    }

    /* When active, boost glowing effects! */
    edgeless-tool-icon-button[active] .flow-circle-active {
      stroke-width: 2.2;
      opacity: 1;
      filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.8));
    }
  `;

  private readonly _props$ = computed(() => {
    const { mode, stroke, strokeWidth, strokeStyle } =
      this.edgeless.std.get(EditPropsStore).lastProps$.value.connector;
    return { mode, stroke, strokeWidth, strokeStyle };
  });

  private readonly _theme$ = computed(() => {
    return this.edgeless.std.get(ThemeProvider).theme$.value;
  });

  override type: GfxToolsFullOptionValue['type'] = 'connector';

  override render() {
    const { stroke, strokeWidth, mode, strokeStyle } = this._props$.value;
    const connectorModeButtonGroup = ConnectorModeButtonGroup(
      mode,
      this.onChange
    );

    return html`
      <edgeless-slide-menu>
        <div class="connector-submenu-content">
          ${connectorModeButtonGroup}
          <div class="submenu-divider"></div>
          
          <!-- Electric Flow Button -->
          <edgeless-tool-icon-button
            .active=${strokeStyle === 'electric'}
            .activeMode=${'background'}
            .tooltip=${'Electric Flow (AI)'}
            .iconSize=${'20px'}
            @click=${() =>
              this.onChange({
                strokeStyle:
                  strokeStyle === 'electric'
                    ? StrokeStyle.Solid
                    : StrokeStyle.Electric,
              })}
          >
            <svg class="flow-svg-icon" width="20" height="20" viewBox="0 0 20 20">
              <circle class="flow-circle-bg" cx="10" cy="10" r="7" />
              <circle class="flow-circle-active electric" cx="10" cy="10" r="7" />
            </svg>
          </edgeless-tool-icon-button>

          <!-- Coir Rope Flow Button -->
          <edgeless-tool-icon-button
            .active=${strokeStyle === 'coir'}
            .activeMode=${'background'}
            .tooltip=${'Coir Rope Flow (AI)'}
            .iconSize=${'20px'}
            @click=${() =>
              this.onChange({
                strokeStyle:
                  strokeStyle === 'coir'
                    ? StrokeStyle.Solid
                    : StrokeStyle.Coir,
              })}
          >
            <svg class="flow-svg-icon coir" width="20" height="20" viewBox="0 0 20 20">
              <circle class="flow-circle-bg" cx="10" cy="10" r="8" />
              <circle class="flow-circle-bg" cx="10" cy="10" r="5" />
              <circle class="flow-circle-active coir-strand-1" cx="10" cy="10" r="8" />
              <circle class="flow-circle-active coir-strand-2" cx="10" cy="10" r="5" />
            </svg>
          </edgeless-tool-icon-button>

          <div class="submenu-divider"></div>
          <edgeless-line-width-panel
            .selectedSize=${strokeWidth}
            @select=${(e: CustomEvent<LineWidth>) =>
              this.onChange({ strokeWidth: e.detail })}
          >
          </edgeless-line-width-panel>
          <div class="submenu-divider"></div>
          <edgeless-color-panel
            class="one-way"
            .value=${stroke}
            .theme=${this._theme$.value}
            .palettes=${DefaultTheme.StrokeColorShortPalettes}
            .hasTransparent=${!this.edgeless.doc
              .get(FeatureFlagService)
              .getFlag('enable_color_picker')}
            @select=${(e: ColorEvent) =>
              this.onChange({ stroke: e.detail.value })}
          ></edgeless-color-panel>
        </div>
      </edgeless-slide-menu>
    `;
  }

  @property({ attribute: false })
  accessor onChange!: (props: Record<string, unknown>) => void;
}
