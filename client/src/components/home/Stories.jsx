import styles from "./Stories.module.css";

const Stories = () => {
  const stories = [
    { id: 1, name: "Your Story" },
    { id: 2, name: "Ravi" },
    { id: 3, name: "Kiran" },
    { id: 4, name: "Rahul" },
    { id: 5, name: "Siva" },
    { id: 6, name: "Ajay" },
  ];

  return (
    <section className={styles.container}>
      {stories.map((story) => (
        <div key={story.id} className={styles.story}>
          <div className={styles.imageWrapper}>
            <img
              src={`https://ui-avatars.com/api/?name=${story.name}`}
              alt={story.name}
            />
          </div>

          <p>{story.name}</p>
        </div>
      ))}
    </section>
  );
};

export default Stories;