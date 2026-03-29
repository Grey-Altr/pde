<!-- PDE-GENERATED | hash:db3f7effd0eccc71 | generated:2026-03-29T02:04:39.865Z -->

---
name: git
description: GIT-CLONE(1)                      Git Manual                      GIT-CLONE(1)

NNAAMMEE
       git-clone - Clone a repository into a new directory

SSYYNNOOPPSSIISS
       ggiitt cclloonnee [----tteemmppllaattee==_<_t_e_m_p_l_a_t_e_-_d_i_r_e_c_t_o_r_y_>]
              [--ll] [--ss] [----nnoo--hhaarrddlliinnkkss] [--qq] [--nn] [----bbaarree] [----mmiirrrroorr]
              [--oo _<_n_a_m_e_>] [--bb _<_n_a_m_e_>] [--uu _<_u_p_l_o_a_d_-_p_a_c_k_>] [----rreeffeerreennccee _<_r_e_p_o_s_i_t_o_r_y_>]
              [----ddiissssoocciiaattee] [----sseeppaarraattee--ggiitt--ddiirr _<_g_i_t_-_d_i_r_>]
              [----ddeepptthh _<_d_e_p_t_h_>] [----[nnoo--]ssiinnggllee--bbrraanncchh] [----nnoo--ttaaggss]
              [----rreeccuurrssee--ssuubbmmoodduulle
binary: /opt/homebrew/bin/git
---

# git

## Goal
Agent-native MCP server wrapping git. Auto-generated from --help output.

## Invocation
Start the MCP server: `node .planning/cli-anything/git/server/server.cjs`

## Tools (22 total)
### git_clone
GIT-CLONE(1)                      Git Manual                      GIT-CLONE(1)

NNAAMMEE
       git-clone - Clone a repository into a new directory

SSYYNNOOPPSSIISS
       ggiitt cclloonnee [----tteemmppllaattee==_<_t_e_m_p_l_a_t_e_-_d_i_r_e_c_t_o_r_y_>]
              [--ll] [--ss] [----nnoo--hhaarrddlliinnkkss] [--qq] [--nn] [----bbaarree] [----mmiirrrroorr]
              [--oo _<_n_a_m_e_>] [--bb _<_n_a_m_e_>] [--uu _<_u_p_l_o_a_d_-_p_a_c_k_>] [----rreeffeerreennccee _<_r_e_p_o_s_i_t_o_r_y_>]
              [----ddiissssoocciiaattee] [----sseeppaarraattee--ggiitt--ddiirr _<_g_i_t_-_d_i_r_>]
              [----ddeepptthh _<_d_e_p_t_h_>] [----[nnoo--]ssiinnggllee--bbrraanncchh] [----nnoo--ttaaggss]
              [----rreeccuurrssee--ssuubbmmoodduulle
**Command:** `clone`
**Input:** `--useJson <boolean>`

### git_init
GIT-INIT(1)                       Git Manual                       GIT-INIT(1)

NNAAMMEE
       git-init - Create an empty Git repository or reinitialize an existing
       one

SSYYNNOOPPSSIISS
       ggiitt iinniitt [--qq | ----qquuiieett] [----bbaarree] [----tteemmppllaattee==_<_t_e_m_p_l_a_t_e_-_d_i_r_e_c_t_o_r_y_>]
             [----sseeppaarraattee--ggiitt--ddiirr _<_g_i_t_-_d_i_r_>] [----oobbjjeecctt--ffoorrmmaatt==_<_f_o_r_m_a_t_>]
             [----rreeff--ffoorrmmaatt==_<_f_o_r_m_a_t_>]
             [--bb _<_b_r_a_n_c_h_-_n_a_m_e_> | ----iinniittiiaall--bbrraanncchh==_<_b_r_a_n_c_h_-_n_a_m_e_>]
             [----sshhaarreedd[==_<_p_e_r_m_i_s_s_i_o_n_s_>]] [_<_d_i_r_e_c_t_o_r_y_>]

DDEESSCCRRIIPPTTIIOONN
       This command creates an empty Git repository
**Command:** `init`
**Input:** `--useJson <boolean>`

### git_add
GIT-ADD(1)                        Git Manual                        GIT-ADD(1)

NNAAMMEE
       git-add - Add file contents to the index

SSYYNNOOPPSSIISS
       ggiitt aadddd [----vveerrbboossee | --vv] [----ddrryy--rruunn | --nn] [----ffoorrccee | --ff] [----iinntteerraaccttiivvee | --ii] [----ppaattcchh | --pp]
            [----eeddiitt | --ee] [----[nnoo--]aallll | --AA | ----[nnoo--]iiggnnoorree--rreemmoovvaall | [----uuppddaattee | --uu]] [----ssppaarrssee]
            [----iinntteenntt--ttoo--aadddd | --NN] [----rreeffrreesshh] [----iiggnnoorree--eerrrroorrss] [----iiggnnoorree--mmiissssiinngg] [----rreennoorrmmaalliizzee]
            [----cchhmmoodd==(++|--)xx] [----ppaatthhssppeecc--ffrroomm--ffiillee==_<_f_i_l_e_> [----ppaatthhssppeec
**Command:** `add`
**Input:** `--useJson <boolean>`

### git_mv
GIT-MV(1)                         Git Manual                         GIT-MV(1)

NNAAMMEE
       git-mv - Move or rename a file, a directory, or a symlink

SSYYNNOOPPSSIISS
       _g_i_t _m_v [<options>] <source>... <destination>

DDEESSCCRRIIPPTTIIOONN
       Move or rename a file, directory, or symlink.

           git mv [-v] [-f] [-n] [-k] <source> <destination>
           git mv [-v] [-f] [-n] [-k] <source> ... <destination-directory>

       In the first form, it renames <source>, which must exist and be either
       a file, symlink or directory, to <destination>. In the second form, the
       last argument has to be an existing directory; the given sources will
       be moved into this directory.

       The index is updated after successful completion, but the change must
       still be committed.

OOPPTTIIOONNSS
       -f, --force
           Force renaming or moving of a file even if the <destination>
           exists.

       -k
        
**Command:** `mv`
**Input:** `--useJson <boolean>`

### git_restore
GIT-RESTORE(1)                    Git Manual                    GIT-RESTORE(1)

NNAAMMEE
       git-restore - Restore working tree files

SSYYNNOOPPSSIISS
       _g_i_t _r_e_s_t_o_r_e [<options>] [--source=<tree>] [--staged] [--worktree] [--] <pathspec>...
       _g_i_t _r_e_s_t_o_r_e [<options>] [--source=<tree>] [--staged] [--worktree] --pathspec-from-file=<file> [--pathspec-file-nul]
       _g_i_t _r_e_s_t_o_r_e (-p|--patch) [<options>] [--source=<tree>] [--staged] [--worktree] [--] [<pathspec>...]

DDEESSCCRRIIPPTTIIOONN
       Restore specified paths in the working tree with some contents from a
       restore source. If a path is tracked but does not exist in the restore
       source, it will be removed to match the source.

       The command can also be used to restore the content in the index with
       ----ssttaaggeedd, or restore both the working tree and the index with ----ssttaaggeedd
       ----wwo
**Command:** `restore`
**Input:** `--useJson <boolean>`

### git_rm
GIT-RM(1)                         Git Manual                         GIT-RM(1)

NNAAMMEE
       git-rm - Remove files from the working tree and from the index

SSYYNNOOPPSSIISS
       _g_i_t _r_m [-f | --force] [-n] [-r] [--cached] [--ignore-unmatch]
                 [--quiet] [--pathspec-from-file=<file> [--pathspec-file-nul]]
                 [--] [<pathspec>...]

DDEESSCCRRIIPPTTIIOONN
       Remove files matching pathspec from the index, or from the working tree
       and the index. ggiitt rrmm will not remove a file from just your working
       directory. (There is no option to remove a file only from the working
       tree and yet keep it in the index; use //bbiinn//rrmm if you want to do that.)
       The files being removed have to be identical to the tip of the branch,
       and no updates to their contents can be staged in the index, though
       that default behavior can be overridden with the --ff option. When
       ----cca
**Command:** `rm`
**Input:** `--useJson <boolean>`

### git_bisect
GIT-BISECT(1)                     Git Manual                     GIT-BISECT(1)

NNAAMMEE
       git-bisect - Use binary search to find the commit that introduced a bug

SSYYNNOOPPSSIISS
       _g_i_t _b_i_s_e_c_t <subcommand> <options>

DDEESSCCRRIIPPTTIIOONN
       The command takes various subcommands, and different options depending
       on the subcommand:

           git bisect start [--term-(bad|new)=<term-new> --term-(good|old)=<term-old>]
                  [--no-checkout] [--first-parent] [<bad> [<good>...]] [--] [<pathspec>...]
           git bisect (bad|new|<term-new>) [<rev>]
           git bisect (good|old|<term-old>) [<rev>...]
           git bisect terms [--term-(good|old) | --term-(bad|new)]
           git bisect skip [(<rev>|<range>)...]
           git bisect reset [<commit>]
           git bisect (visualize|view)
           git bisect replay <logfile>
           git bisect log
           git bisect run <cmd> [<arg>...]
           git bi
**Command:** `bisect`
**Input:** `--useJson <boolean>`

### git_diff
GIT-DIFF(1)                       Git Manual                       GIT-DIFF(1)

NNAAMMEE
       git-diff - Show changes between commits, commit and working tree, etc

SSYYNNOOPPSSIISS
       ggiitt ddiiffff [_<_o_p_t_i_o_n_s_>] [_<_c_o_m_m_i_t_>] [----] [_<_p_a_t_h_>...]
       ggiitt ddiiffff [_<_o_p_t_i_o_n_s_>] ----ccaacchheedd [----mmeerrggee--bbaassee] [_<_c_o_m_m_i_t_>] [----] [_<_p_a_t_h_>...]
       ggiitt ddiiffff [_<_o_p_t_i_o_n_s_>] [----mmeerrggee--bbaassee] _<_c_o_m_m_i_t_> [_<_c_o_m_m_i_t_>...] _<_c_o_m_m_i_t_> [----] [_<_p_a_t_h_>...]
       ggiitt ddiiffff [_<_o_p_t_i_o_n_s_>] _<_c_o_m_m_i_t_>`..._____<_c_o_m_m_i_t_>____ [{empty}--{empty}]{empty} [_____<_p_a_t_h_>____.....]{empty}
       {empty}`git ddiiffff [_<_o_p_t_i_o_n_s_>] _<_b_l_o_b_> _<_b_l
**Command:** `diff`
**Input:** `--useJson <boolean>`

### git_grep
GIT-GREP(1)                       Git Manual                       GIT-GREP(1)

NNAAMMEE
       git-grep - Print lines matching a pattern

SSYYNNOOPPSSIISS
       _g_i_t _g_r_e_p [-a | --text] [-I] [--textconv] [-i | --ignore-case] [-w | --word-regexp]
                  [-v | --invert-match] [-h|-H] [--full-name]
                  [-E | --extended-regexp] [-G | --basic-regexp]
                  [-P | --perl-regexp]
                  [-F | --fixed-strings] [-n | --line-number] [--column]
                  [-l | --files-with-matches] [-L | --files-without-match]
                  [(-O | --open-files-in-pager) [<pager>]]
                  [-z | --null]
                  [ -o | --only-matching ] [-c | --count] [--all-match] [-q | --quiet]
                  [--max-depth <depth>] [--[no-]recursive]
                  [--color[=<when>] | --no-color]
                  [--break] [--heading] [-p | --show-function]
                  [-A <post-context>] [-B <pre-context>] [-C <co
**Command:** `grep`
**Input:** `--useJson <boolean>`

### git_log
GIT-LOG(1)                        Git Manual                        GIT-LOG(1)

NNAAMMEE
       git-log - Show commit logs

SSYYNNOOPPSSIISS
       _g_i_t _l_o_g [<options>] [<revision-range>] [[--] <path>...]

DDEESSCCRRIIPPTTIIOONN
       Shows the commit logs.

       List commits that are reachable by following the ppaarreenntt links from the
       given commit(s), but exclude commits that are reachable from the one(s)
       given with a _^ in front of them. The output is given in reverse
       chronological order by default.

       You can think of this as a set operation. Commits reachable from any of
       the commits given on the command line form a set, and then commits
       reachable from any of the ones given with _^ in front are subtracted
       from that set. The remaining commits are what comes out in the
       command’s output. Various other options and paths parameters can be
       used to further limit the result.

       
**Command:** `log`
**Input:** `--useJson <boolean>`

### git_show
GIT-SHOW(1)                       Git Manual                       GIT-SHOW(1)

NNAAMMEE
       git-show - Show various types of objects

SSYYNNOOPPSSIISS
       _g_i_t _s_h_o_w [<options>] [<object>...]

DDEESSCCRRIIPPTTIIOONN
       Shows one or more objects (blobs, trees, tags and commits).

       For commits it shows the log message and textual diff. It also presents
       the merge commit in a special format as produced by _g_i_t _d_i_f_f_-_t_r_e_e _-_-_c_c.

       For tags, it shows the tag message and the referenced objects.

       For trees, it shows the names (equivalent to _g_i_t _l_s_-_t_r_e_e with
       --name-only).

       For plain blobs, it shows the plain contents.

       Some options that _g_i_t _l_o_g command understands can be used to control
       how the changes the commit introduces are shown.

       This manual page describes only the most frequently used options.

OOPPTTIIOONNSS
      
**Command:** `show`
**Input:** `--useJson <boolean>`

### git_status
GIT-STATUS(1)                     Git Manual                     GIT-STATUS(1)

NNAAMMEE
       git-status - Show the working tree status

SSYYNNOOPPSSIISS
       _g_i_t _s_t_a_t_u_s [<options>] [--] [<pathspec>...]

DDEESSCCRRIIPPTTIIOONN
       Displays paths that have differences between the index file and the
       current HEAD commit, paths that have differences between the working
       tree and the index file, and paths in the working tree that are not
       tracked by Git (and are not ignored by ggiittiiggnnoorree(5)). The first are
       what you _w_o_u_l_d commit by running ggiitt ccoommmmiitt; the second and third are
       what you _c_o_u_l_d commit by running _g_i_t _a_d_d before running ggiitt ccoommmmiitt.

OOPPTTIIOONNSS
       -s, --short
           Give the output in the short-format.

       -b, --branch
           Show the branch and tracking info even in short-format.

       --s
**Command:** `status`
**Input:** `--useJson <boolean>`

### git_branch
GIT-BRANCH(1)                     Git Manual                     GIT-BRANCH(1)

NNAAMMEE
       git-branch - List, create, or delete branches

SSYYNNOOPPSSIISS
       _g_i_t _b_r_a_n_c_h [--color[=<when>] | --no-color] [--show-current]
               [-v [--abbrev=<n> | --no-abbrev]]
               [--column[=<options>] | --no-column] [--sort=<key>]
               [--merged [<commit>]] [--no-merged [<commit>]]
               [--contains [<commit>]] [--no-contains [<commit>]]
               [--points-at <object>] [--format=<format>]
               [(-r | --remotes) | (-a | --all)]
               [--list] [<pattern>...]
       _g_i_t _b_r_a_n_c_h [--track[=(direct|inherit)] | --no-track] [-f]
               [--recurse-submodules] <branchname> [<start-point>]
       _g_i_t _b_r_a_n_c_h (--set-upstream-to=<upstream> | -u <upstream>) [<branchname>]
       _g_i_t _b_r_a_n_c_h --unset-upstream [<branchname>]
       _g_i_t _b_r_a_n_c_h (
**Command:** `branch`
**Input:** `--useJson <boolean>`

### git_commit
GIT-COMMIT(1)                     Git Manual                     GIT-COMMIT(1)

NNAAMMEE
       git-commit - Record changes to the repository

SSYYNNOOPPSSIISS
       _g_i_t _c_o_m_m_i_t [-a | --interactive | --patch] [-s] [-v] [-u<mode>] [--amend]
                  [--dry-run] [(-c | -C | --squash) <commit> | --fixup [(amend|reword):]<commit>]
                  [-F <file> | -m <msg>] [--reset-author] [--allow-empty]
                  [--allow-empty-message] [--no-verify] [-e] [--author=<author>]
                  [--date=<date>] [--cleanup=<mode>] [--[no-]status]
                  [-i | -o] [--pathspec-from-file=<file> [--pathspec-file-nul]]
                  [(--trailer <token>[(=|:)<value>])...] [-S[<keyid>]]
                  [--] [<pathspec>...]

DDEESSCCRRIIPPTTIIOONN
       Create a new commit containing the current contents of the index and
       the given log message describing the changes. The new commit is a
       direct child of HEAD, usual
**Command:** `commit`
**Input:** `--useJson <boolean>`

### git_merge
GIT-MERGE(1)                      Git Manual                      GIT-MERGE(1)

NNAAMMEE
       git-merge - Join two or more development histories together

SSYYNNOOPPSSIISS
       _g_i_t _m_e_r_g_e [-n] [--stat] [--no-commit] [--squash] [--[no-]edit]
               [--no-verify] [-s <strategy>] [-X <strategy-option>] [-S[<keyid>]]
               [--[no-]allow-unrelated-histories]
               [--[no-]rerere-autoupdate] [-m <msg>] [-F <file>]
               [--into-name <branch>] [<commit>...]
       _g_i_t _m_e_r_g_e (--continue | --abort | --quit)

DDEESSCCRRIIPPTTIIOONN
       Incorporates changes from the named commits (since the time their
       histories diverged from the current branch) into the current branch.
       This command is used by ggiitt ppuullll to incorporate changes from another
       repository and can be used by hand to merge changes from one branch
       into another.

       Assume the following history exists 
**Command:** `merge`
**Input:** `--useJson <boolean>`

### git_rebase
GIT-REBASE(1)                     Git Manual                     GIT-REBASE(1)

NNAAMMEE
       git-rebase - Reapply commits on top of another base tip

SSYYNNOOPPSSIISS
       _g_i_t _r_e_b_a_s_e [-i | --interactive] [<options>] [--exec <cmd>]
               [--onto <newbase> | --keep-base] [<upstream> [<branch>]]
       _g_i_t _r_e_b_a_s_e [-i | --interactive] [<options>] [--exec <cmd>] [--onto <newbase>]
               --root [<branch>]
       _g_i_t _r_e_b_a_s_e (--continue|--skip|--abort|--quit|--edit-todo|--show-current-patch)

DDEESSCCRRIIPPTTIIOONN
       If _<_b_r_a_n_c_h_> is specified, ggiitt rreebbaassee will perform an automatic ggiitt
       sswwiittcchh _<_b_r_a_n_c_h_> before doing anything else. Otherwise it remains on the
       current branch.

       If _<_u_p_s_t_r_e_a_m_> is not specified, the upstream configured in
       bbrraanncchh.._<_n_a_m_e_>..rreem
**Command:** `rebase`
**Input:** `--useJson <boolean>`

### git_reset
GIT-RESET(1)                      Git Manual                      GIT-RESET(1)

NNAAMMEE
       git-reset - Reset current HEAD to the specified state

SSYYNNOOPPSSIISS
       _g_i_t _r_e_s_e_t [-q] [<tree-ish>] [--] <pathspec>...
       _g_i_t _r_e_s_e_t [-q] [--pathspec-from-file=<file> [--pathspec-file-nul]] [<tree-ish>]
       _g_i_t _r_e_s_e_t (--patch | -p) [<tree-ish>] [--] [<pathspec>...]
       _g_i_t _r_e_s_e_t [--soft | --mixed [-N] | --hard | --merge | --keep] [-q] [<commit>]

DDEESSCCRRIIPPTTIIOONN
       In the first three forms, copy entries from _<_t_r_e_e_-_i_s_h_> to the index. In
       the last form, set the current branch head (HHEEAADD) to _<_c_o_m_m_i_t_>,
       optionally modifying index and working tree to match. The
       _<_t_r_e_e_-_i_s_h_>/_<_c_o_m_m_i_t_> defaults to HHEEAADD in all forms.

       _g_i_t _r_e_s_e_t [-q] [<tree-ish>] [--] <pathspec>..
**Command:** `reset`
**Input:** `--useJson <boolean>`, `--mixed <boolean>`, `--hard <boolean>`, `--keep <boolean>`, `--merge <boolean>`

### git_switch
GIT-SWITCH(1)                     Git Manual                     GIT-SWITCH(1)

NNAAMMEE
       git-switch - Switch branches

SSYYNNOOPPSSIISS
       _g_i_t _s_w_i_t_c_h [<options>] [--no-guess] <branch>
       _g_i_t _s_w_i_t_c_h [<options>] --detach [<start-point>]
       _g_i_t _s_w_i_t_c_h [<options>] (-c|-C) <new-branch> [<start-point>]
       _g_i_t _s_w_i_t_c_h [<options>] --orphan <new-branch>

DDEESSCCRRIIPPTTIIOONN
       Switch to a specified branch. The working tree and the index are
       updated to match the branch. All new commits will be added to the tip
       of this branch.

       Optionally a new branch could be created with either --cc, --CC,
       automatically from a remote branch of same name (see ----gguueessss), or
       detach the working tree from any branch with ----ddeettaacchh, along with
       switching.

       Switching branches does not require a clean index and working
**Command:** `switch`
**Input:** `--useJson <boolean>`

### git_tag
GIT-TAG(1)                        Git Manual                        GIT-TAG(1)

NNAAMMEE
       git-tag - Create, list, delete or verify a tag object signed with GPG

SSYYNNOOPPSSIISS
       _g_i_t _t_a_g [-a | -s | -u <key-id>] [-f] [-m <msg> | -F <file>] [-e]
               [(--trailer <token>[(=|:)<value>])...]
               <tagname> [<commit> | <object>]
       _g_i_t _t_a_g -d <tagname>...
       _g_i_t _t_a_g [-n[<num>]] -l [--contains <commit>] [--no-contains <commit>]
               [--points-at <object>] [--column[=<options>] | --no-column]
               [--create-reflog] [--sort=<key>] [--format=<format>]
               [--merged <commit>] [--no-merged <commit>] [<pattern>...]
       _g_i_t _t_a_g -v [--format=<format>] <tagname>...

DDEESSCCRRIIPPTTIIOONN
       Add a tag reference in rreeffss//ttaaggss//, unless --dd//--ll//--vv is given to delete,
       list or verify tags.

       Unless --ff is given,
**Command:** `tag`
**Input:** `--useJson <boolean>`

### git_fetch
GIT-FETCH(1)                      Git Manual                      GIT-FETCH(1)

NNAAMMEE
       git-fetch - Download objects and refs from another repository

SSYYNNOOPPSSIISS
       _g_i_t _f_e_t_c_h [<options>] [<repository> [<refspec>...]]
       _g_i_t _f_e_t_c_h [<options>] <group>
       _g_i_t _f_e_t_c_h --multiple [<options>] [(<repository> | <group>)...]
       _g_i_t _f_e_t_c_h --all [<options>]

DDEESSCCRRIIPPTTIIOONN
       Fetch branches and/or tags (collectively, "refs") from one or more
       other repositories, along with the objects necessary to complete their
       histories. Remote-tracking branches are updated (see the description of
       <refspec> below for ways to control this behavior).

       By default, any tag that points into the histories being fetched is
       also fetched; the effect is to fetch tags that point at branches that
       you are interested in. This default behavior can be changed by
**Command:** `fetch`
**Input:** `--useJson <boolean>`

### git_pull
GIT-PULL(1)                       Git Manual                       GIT-PULL(1)

NNAAMMEE
       git-pull - Fetch from and integrate with another repository or a local
       branch

SSYYNNOOPPSSIISS
       _g_i_t _p_u_l_l [<options>] [<repository> [<refspec>...]]

DDEESSCCRRIIPPTTIIOONN
       Incorporates changes from a remote repository into the current branch.
       If the current branch is behind the remote, then by default it will
       fast-forward the current branch to match the remote. If the current
       branch and the remote have diverged, the user needs to specify how to
       reconcile the divergent branches with ----rreebbaassee or ----nnoo--rreebbaassee (or the
       corresponding configuration option in ppuullll..rreebbaassee).

       More precisely, ggiitt ppuullll runs ggiitt ffeettcchh with the given parameters and
       then depending on configuration options or command line flags, wil
**Command:** `pull`
**Input:** `--useJson <boolean>`

### git_push
GIT-PUSH(1)                       Git Manual                       GIT-PUSH(1)

NNAAMMEE
       git-push - Update remote refs along with associated objects

SSYYNNOOPPSSIISS
       _g_i_t _p_u_s_h [--all | --branches | --mirror | --tags] [--follow-tags] [--atomic] [-n | --dry-run] [--receive-pack=<git-receive-pack>]
                  [--repo=<repository>] [-f | --force] [-d | --delete] [--prune] [-q | --quiet] [-v | --verbose]
                  [-u | --set-upstream] [-o <string> | --push-option=<string>]
                  [--[no-]signed|--signed=(true|false|if-asked)]
                  [--force-with-lease[=<refname>[:<expect>]] [--force-if-includes]]
                  [--no-verify] [<repository> [<refspec>...]]

DDEESSCCRRIIPPTTIIOONN
       Updates remote refs using local refs, while sending objects necessary
       to complete the given refs.

       You can make interesting things happen to a repository every time you
       push into it, by setting up 
**Command:** `push`
**Input:** `--useJson <boolean>`

## Flags
--dry-run   Log commands without executing
--json      Append --json to commands for machine output

## Constraints
- Binary path is absolute -- server fails if binary is not at the registered path
- Max subcommand recursion depth: 3
