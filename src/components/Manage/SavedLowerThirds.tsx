import { h } from 'preact';
import {
  MutableRef, useCallback, useMemo, useEffect, useState,
} from 'preact/hooks';
import styled from 'styled-components';
import {
  DatabaseReference, child, off, onValue, push, remove, update,
} from 'firebase/database';
import ShowIcon from '@/assets/show.svg';
import LoadIcon from '@/assets/load.svg';
import SaveIcon from '@/assets/save.svg';
import DeleteIcon from '@/assets/delete.svg';
import { CGConfig } from '@/types';

export type SavedLowerThirdRecord = {
  title: string | null,
  subtitle: string | null,
};

type SavedLowerThirdsProps = {
  lowerThirdTitle: string | null,
  lowerThirdSubtitle: string | null,
  cgConfigRef: MutableRef<DatabaseReference | undefined>,
  onLoad: (record: SavedLowerThirdRecord) => void,
};

const Container = styled.div`
  table tr>td:last-of-type {
    width: 0.1%;
    word-wrap: nowrap;
  }

  .buttons{
    display: flex;
    gap: .5em;
    button {
      display: block;
      width: 100%;
      margin-block: .5em;
      padding: .2em;

      &.destructive {
        background-color: red;
        border-color: red;
      }

      img {
        height: 100%;
      }

      &:hover img {
        filter: grayscale(1);
      }
    }
  }
`;

const SavedLowerThirds = ({
  lowerThirdTitle, lowerThirdSubtitle, cgConfigRef, onLoad,
}: SavedLowerThirdsProps) => {
  const savedRef = useMemo(() => (cgConfigRef.current ? child(cgConfigRef.current, 'lowerThirds') : undefined), [cgConfigRef.current]);
  const [saved, setSaved] = useState<{ [_: string]: SavedLowerThirdRecord }>({});

  useEffect(() => {
    if (savedRef) {
      onValue(savedRef, (snap) => {
        setSaved(snap.val() ?? {});
      });
    }

    return () => {
      if (savedRef) off(savedRef);
    };
  }, [savedRef]);

  const onClickSave = useCallback(() => {
    (async () => {
      if (lowerThirdTitle === null && lowerThirdSubtitle === null) return;
      if (!savedRef) {
        // eslint-disable-next-line no-alert
        alert('Unable to connect to database.');
        return;
      }

      await push(savedRef, {
        title: lowerThirdTitle,
        subtitle: lowerThirdSubtitle,
      });
    })();
  }, [lowerThirdTitle, lowerThirdSubtitle, savedRef]);

  const onClickLoad = useCallback((record: SavedLowerThirdRecord) => {
    onLoad(record);
  }, []);

  const onClickShow = useCallback((rec: SavedLowerThirdRecord) => {
    (async () => {
      if (!cgConfigRef.current) {
        // eslint-disable-next-line no-alert
        alert('Unable to connect to database.');
        return;
      }

      await update(cgConfigRef.current, {
        showLowerThird: true,
        lowerThirdTitle: rec.title,
        lowerThirdSubtitle: rec.subtitle,
      } as Partial<CGConfig>);
    })();
  }, [savedRef, saved]);

  const onClickDelete = useCallback((key: string) => {
    (async () => {
      if (!savedRef) {
        // eslint-disable-next-line no-alert
        alert('Unable to connect to database.');
        return;
      }

      // eslint-disable-next-line no-alert
      if (!window.confirm(`Are you sure you want to delete '${saved[key].title}'?`)) return;

      await remove(child(savedRef, key));
    })();
  }, [savedRef, saved]);

  return (
    <Container>
      <div className="buttons">
        <button
          type="button"
          title="Save"
          onClick={onClickSave}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1em',
          }}
        >
          <img src={SaveIcon} alt="Save" /> <span>Save</span>
        </button>
      </div>
      <h3>Saved</h3>
      <table>
        {Object.keys(saved).length > 0 ? Object.entries(saved).map(([key, rec]) => (
          <tr key={key}>
            <td>
              <div>{rec.title}</div>
              <div style={{ marginLeft: '1em' }}>{rec.subtitle}</div>
            </td>
            <td>
              <div className="buttons">
                <button type="button" title="Load" onClick={() => onClickLoad(rec)}><img src={LoadIcon} alt="Load" /></button>
                <button type="button" title="Immediately Show" onClick={() => onClickShow(rec)}><img src={ShowIcon} alt="Show" /></button>
                <button type="button" className="destructive" title="Delete" onClick={() => onClickDelete(key)}>
                  <img src={DeleteIcon} alt="Delete" />
                </button>
              </div>
            </td>
          </tr>
        )) : <span>You don&apos;t have any saved lower thirds yet...</span>}
      </table>
    </Container>
  );
};

export default SavedLowerThirds;
