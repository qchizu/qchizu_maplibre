<script>
    export let text = 'Button'; // ボタンのテキスト
    export let type = 'button'; // ボタンのタイプ
    export let title = ''; // ボタンのタイトル
    export let onClick = () => {}; // クリックイベント
  </script>
  
  <button type={type} on:click={onClick} class="btn" title={title}>
    {text}
  </button>
  
  <style>
    .btn {
      font-family:  "BIZ UDPGothic", "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
      line-height: 1.5;
      padding: 1px 10px;
      margin: 1px 0px 1px 15px;
      background-color: rgb(100, 100, 100);
      color: rgb(229,229,229);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn:hover {
      background-color: rgb(51, 51, 51);
    }
  </style>
  