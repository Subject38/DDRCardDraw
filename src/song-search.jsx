import classNames from "classnames";
import { useContext, useState, useRef, useLayoutEffect } from "preact/hooks";
import { DrawStateContext } from "./draw-state";
import styles from "./song-search.css";
import { getDrawnChart } from "./card-draw";

function getSuggestions(fuzzySearch, searchTerm, onSelect) {
  if (fuzzySearch && searchTerm) {
    const suggestions = fuzzySearch.search(searchTerm).slice(0, 5);
    if (suggestions.length) {
      return suggestions.map(song => (
        <div className={styles.suggestion}>
          <img src={`jackets/${song.jacket}`} className={styles.img} />
          <div className={styles.title}>
            {song.name_translation || song.name}
            <br />
            {song.artist_translation || song.artist}
          </div>
          {song.single.difficult && (
            <div
              className={classNames(styles.chart, styles.dif)}
              onClick={() =>
                onSelect(
                  getDrawnChart(song, song.single.difficult, "difficult", "Dif")
                )
              }
            >
              DSP
              <br />
              {song.single.difficult.difficulty}
            </div>
          )}
          {song.single.expert && (
            <div
              className={classNames(styles.chart, styles.exp)}
              onClick={() =>
                onSelect(
                  getDrawnChart(song, song.single.expert, "expert", "Exp")
                )
              }
            >
              ESP
              <br />
              {song.single.expert.difficulty}
            </div>
          )}
          {song.single.challenge && (
            <div
              className={classNames(styles.chart, styles.cha)}
              onClick={() =>
                onSelect(
                  getDrawnChart(song, song.single.challenge, "challenge", "Cha")
                )
              }
            >
              CSP
              <br />
              {song.single.challenge.difficulty}
            </div>
          )}
        </div>
      ));
    }
  }
  return null;
}

export function SongSearch(props) {
  const { autofocus, onSongSelect, onCancel } = props;
  const [searchTerm, updateSearchTerm] = useState("");

  const { fuzzySearch } = useContext(DrawStateContext);
  const input = useRef();
  useLayoutEffect(() => {
    if (autofocus && input.current) {
      input.current.focus();
    }
  }, []);

  return (
    <div>
      <input
        ref={input}
        type="search"
        onKeyUp={e => {
          if (e.keyCode === 27) {
            updateSearchTerm("");
            onCancel && onCancel();
          } else if (e.currentTarget.value !== searchTerm) {
            updateSearchTerm(e.currentTarget.value);
          }
        }}
        value={searchTerm}
      />
      <div className={styles.suggestionSet}>
        {getSuggestions(fuzzySearch, searchTerm, onSongSelect)}
      </div>
    </div>
  );
}
